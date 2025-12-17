import { messagingDB } from '../../index.js';
import { MessageModel } from '../../models/message.model.js';
import { UserModel } from '../../models/user.model.js';

export const getMessagesService = async (userDTO) => {
    const messageModel = new MessageModel(messagingDB);
    const senderID = userDTO.from
    const receiverID = userDTO.to 
    const groupID = userDTO.groupID 
    const fromEmail = userDTO.fromEmail 
    const toEmail = userDTO.toEmail 
    let SentMessages = [];
    let ReceivedMessages = [];

    try {
        if (groupID) {
            // fetch messages for the group and map to a canonical payload shape
            const Messages = await messageModel.getMsgByGroupID(groupID);
            const groupPayload = Messages.map(msg => {
                const id = (typeof msg.getDataValue === 'function') ? msg.getDataValue('messageid') : msg.messageid || msg.id;
                const createdAt = (typeof msg.getDataValue === 'function') ? msg.getDataValue('createdAt') : msg.createdAt || msg.timestamp;
                const senderOfMsg = (typeof msg.getDataValue === 'function') ? msg.getDataValue('senderID') : msg.senderID;
                const type = senderOfMsg === senderID ? 'sent' : 'received';
                return {
                    id,
                    senderID: senderOfMsg,
                    from: type === 'sent' ? fromEmail : toEmail,
                    to: type === 'sent' ? toEmail : fromEmail,
                    content: (typeof msg.getDataValue === 'function') ? msg.getDataValue('content') : msg.content,
                    timestamp: createdAt,
                    type,
                    read: !!msg.read,
                    groupID: (typeof msg.getDataValue === 'function') ? msg.getDataValue('groupID') : msg.groupID,
                };
            });

            // sort by timestamp to ensure chronological order
            groupPayload.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            // split for backwards compatibility with downstream logic
            SentMessages = groupPayload.filter(m => m.type === 'sent');
            ReceivedMessages = groupPayload.filter(m => m.type === 'received');

            console.log('Marking group messages as read for', fromEmail, 'in group', groupID);
        } else {
            SentMessages = await messageModel.getMsgByUserIDs(senderID, receiverID);
            ReceivedMessages = await messageModel.getMsgByUserIDs(receiverID, senderID);
        }
        // Safely mark received messages as read. Messages may be plain objects (with `id`) or Sequelize instances (with `messageid` or getDataValue).
        ReceivedMessages.forEach(msg => {
            const mid = msg && (msg.messageid || msg.id || (typeof msg.getDataValue === 'function' ? msg.getDataValue('messageid') : undefined));
            if (mid) {
                messageModel.updateReadStatus(mid, true).catch(err => console.warn('Failed to update read status for', mid, err && err.message));
            } else {
                console.warn('Skipping updateReadStatus: could not resolve message id for', msg);
            }
        });
        const payloadSent = (SentMessages || []).map(msg => {
            const id = (typeof msg.getDataValue === 'function') ? msg.getDataValue('messageid') : (msg.id || msg.messageid);
            const timestamp = (typeof msg.getDataValue === 'function') ? msg.getDataValue('createdAt') : (msg.timestamp || msg.createdAt);
            return {
                id,
                senderID: (typeof msg.getDataValue === 'function') ? msg.getDataValue('senderID') : (msg.senderID || null),
                from: fromEmail,
                to: toEmail,
                content: (typeof msg.getDataValue === 'function') ? msg.getDataValue('content') : msg.content,
                timestamp,
                type: 'sent',
                read: !!msg.read,
                groupID: (typeof msg.getDataValue === 'function') ? msg.getDataValue('groupID') : msg.groupID,
            };
        });
        const payloadReceived = (ReceivedMessages || []).map(msg => {
            const id = (typeof msg.getDataValue === 'function') ? msg.getDataValue('messageid') : (msg.id || msg.messageid);
            const timestamp = (typeof msg.getDataValue === 'function') ? msg.getDataValue('createdAt') : (msg.timestamp || msg.createdAt);
            return {
                id,
                senderID: (typeof msg.getDataValue === 'function') ? msg.getDataValue('senderID') : (msg.senderID || null),
                from: toEmail,
                to: fromEmail,
                content: (typeof msg.getDataValue === 'function') ? msg.getDataValue('content') : msg.content,
                timestamp,
                type: 'received',
                read: !!msg.read,
                groupID: (typeof msg.getDataValue === 'function') ? msg.getDataValue('groupID') : msg.groupID,
            };
        });
        const mergedPayload = [
            ...payloadSent,
            ...payloadReceived
        ];
        mergedPayload.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Enrich messages with sender profile info (avatar, userId, name) so clients
        // can display avatars for historical messages immediately.
        try {
            const userModel = new UserModel(messagingDB);
            // collect unique sender ids and emails from merged payload
            const ids = Array.from(new Set((mergedPayload || []).map(m => m.senderID).filter(Boolean)));
            const emails = Array.from(new Set((mergedPayload || []).map(m => m.from).filter(Boolean)));
            const usersById = new Map();
            const usersByEmail = new Map();
            if (ids.length > 0) {
                const usersByIdList = await userModel.getUserModel().findAll({ where: { id: ids }, raw: true });
                for (const u of usersByIdList || []) if (u && u.id) usersById.set(String(u.id), u);
            }
            if (emails.length > 0) {
                const usersByEmailList = await userModel.getUserModel().findAll({ where: { email: emails }, raw: true });
                for (const u of usersByEmailList || []) if (u && u.email) usersByEmail.set(String(u.email), u);
            }
            for (const m of mergedPayload) {
                try {
                    let u = null;
                    if (m && m.senderID) u = usersById.get(String(m.senderID)) || null;
                    if (!u && m && m.from) u = usersByEmail.get(String(m.from)) || null;
                    if (u) {
                        m.fromUserId = u.id || m.fromUserId || null;
                        m.fromAvatar = u.avatarUrl || m.fromAvatar || null;
                        m.fromName = u.username || u.email || m.fromName || null;
                        m.fromUsername = u.username || null;
                        m.username = u.username || u.email || m.username || null;
                    }
                } catch (e) {
                    // ignore per-message enrichment errors
                }
            }
        } catch (enrichErr) {
            console.warn('Could not enrich previous messages with user profiles:', enrichErr && enrichErr.message);
        }

        // Diagnostic & fallback: if any merged message still lacks an avatar, try per-message lookup
        try {
            const missing = (mergedPayload || []).filter(m => !m.fromAvatar && (m.senderID || m.from));
            if (missing.length > 0) {
                console.log(`getMessages: ${missing.length} messages missing fromAvatar; attempting per-message lookup`);
                const userModel = new UserModel(messagingDB);
                for (const m of missing) {
                    try {
                        let u = null;
                        if (m.senderID) {
                            u = await userModel.getUserModel().findOne({ where: { id: m.senderID }, raw: true });
                        }
                        if (!u && m.from) {
                            u = await userModel.getUserModel().findOne({ where: { email: m.from }, raw: true });
                        }
                        if (u) {
                                m.fromUserId = u.id || m.fromUserId || null;
                                m.fromAvatar = u.avatarUrl || m.fromAvatar || null;
                                m.fromName = u.username || u.email || m.fromName || null;
                                m.fromUsername = u.username || null;
                                m.username = u.username || u.email || m.username || null;
                        }
                    } catch (innerErr) {
                        console.warn('Per-message enrichment failed for', m && (m.id || m.senderID || m.from), innerErr && innerErr.message);
                    }
                }
            }
        } catch (fbErr) {
            console.warn('Fallback enrichment failed:', fbErr && fbErr.message);
        }
    } catch (err) {
        console.error('Error in getMessagesService:', err);
    }
    
    return mergedPayload;
}