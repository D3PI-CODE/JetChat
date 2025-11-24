import { io, messagingDB } from '../index.js';
import { MessageModel } from '../models/message.model.js';
import { UserModel } from '../models/user.model.js';

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





