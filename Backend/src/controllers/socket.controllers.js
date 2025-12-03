import { io, messagingDB } from '../index.js';
import { MessageModel } from '../models/message.model.js';
import { UserModel } from '../models/user.model.js';
import Cloudinary from '../lib/CloudinaryInit.js';
import redisClient, { redisHSetOrGet } from '../lib/RedisInit.js';

export const connection =  async (socket) => {
    console.log("Socket connected, socket id: " + socket.id + " userID: " + socket.userID);
    console.log("User email: " + socket.email);
    // Try to resolve the canonical DB id for this connection. The middleware
    // may have set socket.userID to an email as a fallback; prefer DB id.
    try {
        const canonicalId = socket.userID;
        if (canonicalId) {
            socket.userID = canonicalId; // use DB id for room name
            socket.join(String(canonicalId));
        } else {
            console.warn('Could not resolve canonical user id for socket; not joining user room.', { socketId: socket.id, providedUserID: socket.userID, email: socket.email });
        }
    } catch (err) {
        console.error('Error resolving canonical user id for socket:', err);
    }

    const broadcastUserIds = async () => {
        try {
            const userModel = new UserModel(messagingDB);
            // fetch all users from DB
            const allUsers = await userModel.getUserModel().findAll({ raw: true });

            // Build a set of connected user identifiers (DB ids or emails)
            redisClient.del("user:online");
            for (const s of Array.from(io.of("/").sockets.values())) {
                if (s.userID) redisClient.SADD("user:online", String(s.userID));
                else if (s.email) redisClient.SADD("user:online", s.email);
            }
            

            const userArr = await Promise.all((allUsers || []).map(async u => ({
                id: u.id,
                email: u.email,
                username: u.username ?? u.email,
                avatarUrl: u.avatarUrl || null,
                // online if any connected socket has this DB id or email
                online: await redisClient.SISMEMBER("user:online", String(u.id)) === 1 ? true : false,
            })));

            console.log("Broadcasting users (with online status):", userArr);
            io.emit("users", userArr);
        } catch (err) {
            console.error('Error broadcasting users:', err);
        }
    };

    broadcastUserIds();

    // Ensure getMessages replies only to the requesting socket
    socket.on("getMessages", (data) => getMessages(socket, data));

    //sends a message to a specific user (by email or DB id)
    socket.on("sendMessage", sendMessage);

    // pass socket through so handler can ack back to the requesting socket
    socket.on("changeProfilePic", (data) => changeProfilePic(socket, data));

    // mark message as read
    socket.on("markAsRead", markAsRead);
    
    // When a socket disconnects, broadcast the updated list of user IDs
    socket.on('disconnect', () => {
        console.log("user disconnected: " + socket.id + " (userID: " + socket.userID + ")");
        broadcastUserIds();
    });
};

export const markAsRead = async (data) => {
    try {
        const messageModel = new MessageModel(messagingDB);
        const userModel = new UserModel(messagingDB);
        const sender = data.fromEmail
        const receiver = data.toEmail
        const messageID = data.id;
        if (!messageID) {
            console.warn('markAsRead called without message ID');
            return;
        }
        const message = await messageModel.getMessageModel().findOne({ 
            where: { messageid: messageID },
            include: userModel.getUserModel(),
        });
        if (!message) {
            console.warn(`markAsRead: message ID ${messageID} not found`);
            return;
        }
        await messageModel.updateReadStatus(messageID, true);
        console.log(`Message ID ${messageID} marked as read.`);
        // Notify the sender and receiver rooms (prefer DB ids, fall back to email)
        try {
            const senderID = await userModel.emailSearch(sender);
            const receiverID = await userModel.emailSearch(receiver);
            const payload = {
                id: messageID,
                content: message.getDataValue("content"),
                fromEmail: sender,
                toEmail: receiver,
                timestamp: message.getDataValue("createdAt") ?? new Date().toISOString(),
                type: 'received',
                read: true,
            };
            const senderRoom = senderID ? String(senderID) : String(sender);
            const receiverRoom = receiverID ? String(receiverID) : String(receiver);
            io.to(senderRoom).emit('messageReadAck', payload);
            io.to(receiverRoom).emit('messageReadAck', payload);
        } catch (emitErr) {
            console.error('Error emitting messageReadAck to user rooms:', emitErr);
        }
    } catch (err) {
        console.error('Error in markAsRead:', err);
    }
};

export const sendMessage = async (data) => {
    const messageModel = new MessageModel(messagingDB);
    const userModel = new UserModel(messagingDB);
    const sender = data.fromEmail
    const receiver = data.toEmail
    console.log(sender, receiver)
    const senderID = await userModel.emailSearch(sender);
    const receiverID = await userModel.emailSearch(receiver);
    console.log("senderID: ", senderID, " receiverID: ", receiverID);
    const message = await messageModel.createMessage(senderID, receiverID, data.message);
    let mappedData = {
        id: message.getDataValue("messageid"),
        content: message.getDataValue("content"),
        fromEmail: sender,
        toEmail: receiver,
        timestamp: message.getDataValue("createdAt") ?? new Date().toISOString(),
        read: false,
    }
    console.log("the msg is being sent to", receiverID)
    // Emit to the receiver's user room (prefer DB id, otherwise use email)
    const receiverRoom = receiverID ? String(receiverID) : String(receiver);
    io.to(receiverRoom).emit("receiveMessage", mappedData);
    console.log("Message emitted to receiver room:", receiverRoom, mappedData);
    // Emit to the sender's room so sender receives canonical message id
    const senderRoom = senderID ? String(senderID) : String(sender);
    io.to(senderRoom).emit("sentMessage", mappedData);
    console.log(mappedData);
};

export const getMessages = async (socket, data) => {
    try {
        const messageModel = new MessageModel(messagingDB);
        const userModel = new UserModel(messagingDB);
        const senderID = await userModel.emailSearch(data.fromEmail);
        const receiverID = await userModel.emailSearch(data.toEmail);
        const SentMessages = await messageModel.getMsgByUserIDs(senderID, receiverID);
        const ReceivedMessages = await messageModel.getMsgByUserIDs(receiverID, senderID);
        ReceivedMessages.map(msg => {
            messageModel.updateReadStatus(msg.messageid, true);
        })
        const payloadSent = (SentMessages || []).map(msg => ({
            id: (typeof msg.getDataValue === 'function') ? msg.getDataValue('messageid') : msg.messageid,
            from: data.fromEmail,
            to: data.toEmail,
            content: (typeof msg.getDataValue === 'function') ? msg.getDataValue('content') : msg.content,
            timestamp: (typeof msg.getDataValue === 'function') ? msg.getDataValue('createdAt') : msg.createdAt,
            type: 'sent',
            read: msg.read,
        }));
        const payloadReceived = (ReceivedMessages || []).map(msg => ({
            id: (typeof msg.getDataValue === 'function') ? msg.getDataValue('messageid') : msg.messageid,
            from: data.toEmail,
            to: data.fromEmail,
            content: (typeof msg.getDataValue === 'function') ? msg.getDataValue('content') : msg.content,
            timestamp: (typeof msg.getDataValue === 'function') ? msg.getDataValue('createdAt') : msg.createdAt,
            type: 'received',
            read: msg.read,
        }));
        const mergedPayload = [
            ...payloadSent,
            ...payloadReceived
        ];
        mergedPayload.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        socket.emit("previousMessages", mergedPayload);
        // Notify the other user (mark as read) using their DB id room if available
        console.log('Marking messages as read for', data.toEmail, 'to', data.fromEmail);
        if (receiverID) {
            io.to(String(receiverID)).emit("messageReadAck", { fromEmail: data.toEmail, toEmail: data.fromEmail });
        } else {
            // fallback to email room
            io.to(String(data.toEmail)).emit("messageReadAck", { fromEmail: data.toEmail, toEmail: data.fromEmail });
        }
    } catch (err) {
        console.error('Error in getMessages:', err);
        // Inform the requesting socket of the failure
        socket.emit('previousMessagesError', { error: 'Failed to load messages' });
    }
}

export const changeProfilePic = async (socket, data) => {
    try {
        console.log('changeProfilePic invoked by', socket.id, 'socket.email=', socket.email, 'payloadEmail=', data?.email ?? '(none)');
        if (!data || !data.imageData || !data.email) {
            socket.emit('profilePicUpdateError', { error: 'Missing imageData or email' });
            return;
        }

        // Ensure imageData is a data URL. If it's plain base64, prefix it so Cloudinary accepts it.
        let payload = data.imageData && typeof data.imageData === 'string' ? data.imageData.trim() : '';
        const base64Only = /^[A-Za-z0-9+/]+={0,2}$/.test(payload) && !payload.startsWith('data:');
        if (base64Only) {
            // Heuristic to detect image type from base64 signature
            const sig = payload.slice(0, 8);
            let mime = 'image/jpeg';
            if (sig.startsWith('/9j')) mime = 'image/jpeg';            // JPEG
            else if (sig.startsWith('iVBOR')) mime = 'image/png';     // PNG (iVBORw0K...)
            else if (sig.startsWith('R0lG')) mime = 'image/gif';      // GIF
            else if (sig.startsWith('UklG') || sig.startsWith('RIFF')) mime = 'image/webp'; // WEBP
            // default to jpeg if unknown
            payload = `data:${mime};base64,${payload}`;
        }

        // log payload info (don't log full base64)
        const header = payload.slice(0, 100);
        const sizeApprox = Math.ceil((payload.length - (payload.indexOf('base64,') + 7)) * 3 / 4) || 0;
        console.log('Uploading image. payload startsWith:', header.replace(/\n/g, ''), 'approx bytes:', sizeApprox);

        // Show a console spinner/progress while the async upload runs so devs can see activity.
        const spinnerChars = ['|', '/', '-', '\\'];
        const startTime = Date.now();
        // crude estimated duration based on size (ms) - just for nicer UX; not accurate
        const estimatedDuration = Math.min(20000, Math.max(1500, Math.round(sizeApprox / 1000 * 150)));
        let spinIndex = 0;
        const spinnerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(99, Math.round((elapsed / estimatedDuration) * 100));
            const spinner = spinnerChars[spinIndex % spinnerChars.length];
            process.stdout.write(`\rUploading profile pic ${spinner} ${pct}% (approx)`);
            spinIndex++;
        }, 150);

        let result;
        try {
            // Upload via configured Cloudinary instance (imported from ../lib/Cloudinary.js)
            result = await Cloudinary.uploader.upload(payload, {
                folder: 'avatars',
                resource_type: 'image',
            });
        } finally {
            clearInterval(spinnerInterval);
            const totalElapsed = Date.now() - startTime;
            // clear line and print final status
            process.stdout.write('\r');
            if (result && result.secure_url) {
                console.log(`Upload finished in ${totalElapsed}ms - secure_url: ${result.secure_url}`);
            } else {
                console.log(`Upload finished in ${totalElapsed}ms`);
            }
        }
        console.log('Cloudinary upload result:', { public_id: result?.public_id, secure_url: result?.secure_url });
        const imageUrl = result?.secure_url;
        if (!imageUrl) {
            throw new Error('Cloudinary did not return a secure_url');
        }

        // update user record in DB with avatarUrl
        try {
            const userModel = new UserModel(messagingDB);
            await userModel.getUserModel().update({ avatarUrl: imageUrl }, { where: { email: data.email } });

            // rebroadcast users so clients get updated avatarUrl
            const allUsers = await userModel.getUserModel().findAll({ raw: true });
            const emailToSocketIds = {};
            for (let [sid, s] of io.of("/").sockets) {
                const email = s.email;
                if (!email) continue;
                if (!emailToSocketIds[email]) emailToSocketIds[email] = [];
                emailToSocketIds[email].push(sid);
            }
            const userArr = (allUsers || []).map(u => ({
                id: u.id,
                email: u.email,
                username: u.username ?? u.email,
                avatarUrl: u.avatarUrl || null,
                socketIds: emailToSocketIds[u.email] || [],
                online: (emailToSocketIds[u.email] || []).length > 0,
            }));
            io.emit('users', userArr);

            // ack back to the requesting socket with the new URL
            socket.emit('profilePicUpdated', { email: data.email, avatarUrl: imageUrl });
        } catch (dbErr) {
            console.error('Failed to update user avatar in DB:', dbErr);
            socket.emit('profilePicUpdateError', { error: 'Failed to update DB', details: dbErr.message });
        }
    } catch (err) {
        console.error('Cloudinary upload error:', err);
        socket?.emit?.('profilePicUpdateError', { error: 'Cloudinary upload failed', details: err.message });
    }
}






