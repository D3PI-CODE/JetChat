import { io, messagingDB } from '../../index.js';
import { MessageModel } from '../../models/message.model.js';
import { UserModel } from '../../models/user.model.js';
import {GroupModel } from '../../models/Group.model.js';
import { unreadMessageCount } from './unreadMessages.js';

export const sendMessage = async (socket, data) => {
    const messageModel = new MessageModel(messagingDB);
    const userModel = new UserModel(messagingDB);
    const sender = data.fromEmail
    const receiver = data.toEmail
    console.log(sender, receiver)
    const senderID = data.fromUserId
    const receiverID = data.toUserId
    const groupID = data.groupID || null;
    console.log(senderID, receiverID)
    console.log("senderID: ", senderID, " receiverID: ", receiverID);
    // If this is a group message, store groupID and keep receiverID null
    let message;
    if (groupID) {
        message = await messageModel.getMessageModel().create({ senderID, receiverID: null, content: data.message, groupID });
    } else {
        message = await messageModel.createMessage(senderID, receiverID, data.message);
    }
    let mappedData = {
        id: message.getDataValue("messageid"),
        content: message.getDataValue("content"),
        fromEmail: sender,
        toEmail: receiver,
        timestamp: message.getDataValue("createdAt") ?? new Date().toISOString(),
        read: false,
        groupID: groupID || null,
    }
    // Propagate forwarded metadata if provided by the client
    if (data && data.forwardedFrom) {
        try {
            mappedData.forwardedFrom = data.forwardedFrom;
            mappedData.forwarded = true;
        } catch (e) { /* ignore */ }
    }
    console.log("the msg is being sent to", receiverID)
    // Emit to the receiver's user room (prefer DB id, otherwise use email)
    if (groupID) {
        // Emit group message only to group members
        try {
            const groupModelInstance = new GroupModel(messagingDB);
            const groupMemberModel = groupModelInstance.GroupMember;
            const members = await groupMemberModel.findAll({ where: { groupID } });
            // Attach sender profile info so recipients can render avatar immediately
            let senderProfile = null;
            try {
                if (senderID) senderProfile = await userModel.getUserModel().findOne({ where: { id: senderID }, raw: true });
                if (!senderProfile && sender) senderProfile = await userModel.getUserModel().findOne({ where: { email: sender }, raw: true });
            } catch (profErr) {
                console.warn('Could not load sender profile for message:', profErr && profErr.message);
            }
            if (senderProfile) {
                mappedData.fromUserId = senderProfile.id || senderID || null;
                mappedData.fromAvatar = senderProfile.avatarUrl || null;
                mappedData.fromName = senderProfile.username || senderProfile.email || null;
                mappedData.fromUsername = senderProfile.username || null;
                mappedData.username = senderProfile.username || senderProfile.email || null;
            } else {
                mappedData.fromUserId = senderID || null;
                mappedData.fromAvatar = null;
                mappedData.fromName = sender || null;
                mappedData.fromUsername = null;
                mappedData.username = sender || null;
            }

            for (const m of members) {
                const memberId = m && (m.memberID || (typeof m.getDataValue === 'function' ? m.getDataValue('memberID') : undefined));
                if (!memberId) continue;
                // don't send the group 'receiveMessage' to the sender — sender will get a 'sentMessage'
                if (senderID && String(memberId) === String(senderID)) continue;
                if (sender && String(memberId) === String(sender)) continue;

                const room = String(memberId);
                try {
                    io.to(room).emit('receiveMessage', mappedData);
                    unreadMessageCount(socket, {receiverID: memberId});
                } catch (emitErr) {
                    console.warn('Failed to emit receiveMessage to room', room, emitErr && emitErr.message);
                }
            }
            console.log("Message emitted to group members:", groupID, mappedData);
        } catch (groupErr) {
            console.error('Failed to emit group message to members, falling back to broadcast:', groupErr);
            io.emit('receiveMessage', mappedData);
        }
    } else {
        // Attach sender profile for 1-1 message so recipient can render avatar
        try {
            let senderProfile = null;
            if (senderID) senderProfile = await userModel.getUserModel().findOne({ where: { id: senderID }, raw: true });
            if (!senderProfile && sender) senderProfile = await userModel.getUserModel().findOne({ where: { email: sender }, raw: true });
            if (senderProfile) {
                mappedData.fromUserId = senderProfile.id || senderID || null;
                mappedData.fromAvatar = senderProfile.avatarUrl || null;
                mappedData.fromName = senderProfile.username || senderProfile.email || null;
                mappedData.fromUsername = senderProfile.username || null;
                mappedData.username = senderProfile.username || senderProfile.email || null;
            } else {
                mappedData.fromUserId = senderID || null;
                mappedData.fromAvatar = null;
                mappedData.fromName = sender || null;
                mappedData.fromUsername = null;
                mappedData.username = sender || null;
            }
        } catch (profErr) {
            console.warn('Could not load sender profile for 1-1 message:', profErr && profErr.message);
        }
        const receiverRoom = receiverID ? String(receiverID) : String(receiver);
        io.to(receiverRoom).emit("receiveMessage", mappedData);
        console.log("receiverRoom:", receiverRoom);
        unreadMessageCount(socket, {receiverID: receiverRoom});
        console.log("Message emitted to receiver room:", receiverRoom, mappedData);
    }
    // Emit to the sender's room so sender receives canonical message id
    const senderRoom = senderID ? String(senderID) : String(sender);
    io.to(senderRoom).emit("sentMessage", mappedData);
    console.log(mappedData);
};