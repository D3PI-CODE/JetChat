import {messagingDB } from '../../index.js';
import { MessageModel } from '../../models/message.model.js';

interface UnreadMessageCountData {
    receiverID?: string;
}

interface authSocket {
    userID?: string;
    emit: (event: string, data: any) => void;
    to: (room: string) => any;
}

export const unreadMessageCount = async (
    socket: authSocket,
    data: UnreadMessageCountData
    ): Promise<void> => {
    try {
        const userID = socket.userID
        const receiverID = data.receiverID;
        if (!userID || !receiverID) {
            try { socket.emit('unreadMessageCountError', { error: 'Missing userID or receiverID' }); } catch (e) {}
            return;
        }
        const messageModel = new MessageModel(messagingDB);
        const count = await messageModel.countUnreadMessages(userID, receiverID);
        socket.to(userID).to(receiverID).emit('unreadMessageCount', { userID, receiverID, count });
        console.log(`Unread message count for userID: ${userID}, receiverID: ${receiverID} is ${count}`);
    } catch (err: unknown) {
        console.error('Error in unreadMessageCount:', err);
        const errorMessage = err instanceof Error ? err.message : 'unreadMessageCount failed';
        try { socket.emit('unreadMessageCountError', { error: errorMessage }); } catch (e) {}
    }
};
