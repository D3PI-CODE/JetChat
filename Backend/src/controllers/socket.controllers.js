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
    await messageModel.createMessage(senderID, receiverID, data.message);
    console.log("message received: ", data);
    io.to(data.to).emit("receiveMessage", data);
    console.log("message sent to: ", data.to);
};

export const getMessages = async (socket, senderEmail, receiverEmail) => {
    try {
        const messageModel = new MessageModel(messagingDB);
        const userModel = new UserModel(messagingDB);
        const senderID = await userModel.emailSearch(senderEmail);
        const receiverID = await userModel.emailSearch(receiverEmail);
        const SentMessages = await messageModel.getMsgByUserIDs(senderID, receiverID);
        const ReceivedMessages = await messageModel.getMsgByUserIDs(receiverID, senderID);
        // Map Sequelize instances to plain objects to ensure JSON-safe payload
        const payloadSent = (SentMessages || []).map(msg => ({
            from: senderEmail,
            to: receiverEmail,
            content: (typeof msg.getDataValue === 'function') ? msg.getDataValue('content') : msg.content,
            timestamp: (typeof msg.getDataValue === 'function') ? msg.getDataValue('createdAt') : msg.createdAt,
            type: 'sent',
        }));
        const payloadReceived = (ReceivedMessages || []).map(msg => ({
            from: receiverEmail,
            to: senderEmail,
            content: (typeof msg.getDataValue === 'function') ? msg.getDataValue('content') : msg.content,
            timestamp: (typeof msg.getDataValue === 'function') ? msg.getDataValue('createdAt') : msg.createdAt,
            type: 'received',
        }));
        const mergedPayload = [
            ...payloadSent,
            ...payloadReceived
        ];
        mergedPayload.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        socket.emit("previousMessages", mergedPayload);
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






