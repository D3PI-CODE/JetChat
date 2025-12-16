import {messagingDB } from '../../index.js';
import { MessageModel } from '../../models/message.model.js';

export const unreadMessageCount = async (socket, data) => {
    try {
        const userID = socket.userID
        const receiverID = data && data.receiverID;
        if (!userID) {
            try { socket.emit('unreadMessageCountError', { error: 'Missing userID' }); } catch (e) {}
            return;
        }
        const messageModel = new MessageModel(messagingDB);
        const count = await messageModel.countUnreadMessages(userID, receiverID);
        socket.to(userID).to(receiverID).emit('unreadMessageCount', { userID, receiverID, count });
        console.log(`Unread message count for userID: ${userID}, receiverID: ${receiverID} is ${count}`);
    } catch (err) {
        console.error('Error in unreadMessageCount:', err);
        try { socket.emit('unreadMessageCountError', { error: err && err.message || 'unreadMessageCount failed' }); } catch (e) {}
    }
};