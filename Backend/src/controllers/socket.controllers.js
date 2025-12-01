import { io, messagingDB } from '../index.js';
import { MessageModel } from '../models/message.model.js';
import { UserModel } from '../models/user.model.js';
import Cloudinary from '../lib/Cloudinary.js';

export const connection =  (socket) => {
    console.log("a user connected: " + socket.id);
    socket.email = socket.handshake.auth.email;
    console.log("User email: " + socket.email);
  // Build and broadcast a list of all application users with online status.
  // This ensures that when a user disconnects (logs out) they remain visible
  // to clients but are marked as offline.
    const broadcastUserIds = async () => {
        try {
            const userModel = new UserModel(messagingDB);
            // fetch all users from DB
            const allUsers = await userModel.getUserModel().findAll({ raw: true });

            // build a map of email -> array of connected socket ids
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

            // also include any connected emails that don't exist in DB (fallback)
            for (const [sid, s] of io.of("/").sockets) {
                const email = s.email;
                if (!email) continue;
                const exists = userArr.find(x => x.email === email);
                if (!exists) {
                    userArr.push({
                        id: null,
                        email,
                        username: email,
                        socketIds: emailToSocketIds[email] || [sid],
                        online: true,
                    });
                }
            }

            console.log("Broadcasting users (with online status):", userArr);
            io.emit("users", userArr);
        } catch (err) {
            console.error('Error broadcasting users:', err);
        }
    };
    // Send initial list to everyone (including the newly connected socket)
    broadcastUserIds();

    // Ensure getMessages replies only to the requesting socket
    socket.on("getMessages", (senderEmail, receiverEmail) => getMessages(socket, senderEmail, receiverEmail));

    //sends a message to a specific socket id
    socket.on("sendMessage", sendMessage);

    // pass socket through so handler can ack back to the requesting socket
    socket.on("changeProfilePic", (data) => changeProfilePic(socket, data));

    socket.on("markAsRead", async (data) => {
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
            io.emit('messageReadAck', {
                id: messageID,
                content: message.getDataValue("content"),
                fromEmail: sender,
                toEmail: receiver,
                timestamp: message.getDataValue("createdAt") ?? new Date().toISOString(),
                type: 'received',
                read: false,
            });
        } catch (err) {
            console.error('Error in markAsRead:', err);
        }
    });
    
    // When a socket disconnects, broadcast the updated list of user IDs
    socket.on('disconnect', () => {
        console.log("user disconnected: " + socket.id);
        broadcastUserIds();
    });
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
    console.log("the msg is being sent to", data.to)
    if (data.to == []) {
        io.to(data.to).emit("receiveMessage", mappedData);
        console.log("Message sent to specific socket:", mappedData);
    }
    io.to(data.from).emit("sentMessage", mappedData);
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
        console.log('Marking messages as read for', data.toEmail, 'to', data.fromEmail, 'on sockets:', data.to.at(-1));
        io.to(data.to.at(-1)).emit("messageReadAck", { fromEmail: data.toEmail, toEmail: data.fromEmail });
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






