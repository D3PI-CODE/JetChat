import { io, messagingDB } from '../../index.js';
import { MessageModel } from '../../models/message.model.js';
import { UserModel } from '../../models/user.model.js';

export const markAsRead = async (data: any): Promise<void> => {
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
            const senderID = data.fromUserId
            const receiverID = data.toUserId
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
        } catch (emitErr: unknown) {
            console.error('Error emitting messageReadAck to user rooms:', emitErr);
        }
    } catch (err: unknown) {
        console.error('Error in markAsRead:', err);
    }
};
