import { io, messagingDB } from '../index.js';
import { MessageModel } from '../models/message.model.js';
import { UserModel } from '../models/user.model.js';
import Cloudinary from '../lib/CloudinaryInit.js';
import redisClient, { redisHSetOrGet } from '../lib/RedisInit.js';
import { GroupMemberModel } from '../models/groupMember.model.js';
import { GroupModel } from '../models/Group.model.js';

// Broadcast current users and their online status to all connected sockets.
export const broadcastUserIds = async () => {
    try {
        const userModel = new UserModel(messagingDB);
        const allUsers = await userModel.getUserModel().findAll({ raw: true });
        try {
            await redisClient.del("user:online");
        } catch (e) {
            console.warn('Redis DEL user:online failed:', e && e.message);
        }
        for (const s of Array.from(io.of("/").sockets.values())) {
            try {
                if (s.userID) await redisClient.SADD("user:online", String(s.userID));
                else if (s.email) await redisClient.SADD("user:online", s.email);
            } catch (e) {
                console.warn('Redis SADD failed for user presence:', e && e.message);
            }
        }

        const userArr = await Promise.all((allUsers || []).map(async u => ({
            id: u.id,
            email: u.email,
            username: u.username ?? u.email,
            avatarUrl: u.avatarUrl || null,
            online: await redisClient.SISMEMBER("user:online", String(u.id)) === 1 ? true : false,
        })));

        console.log("Broadcasting users (with online status):", userArr);
        io.emit("users", userArr);
    } catch (err) {
        console.error('Error broadcasting users:', err);
    }
};

export const broadcastGroups = async () => {
    try {
        const groupModelInstance = new GroupModel(messagingDB);
        const groupModel = groupModelInstance.getGroupModel();
        
        const allGroups = await groupModel.findAll({ raw: true });
        // For each group, fetch members and emit the group info only to its members
        for (const g of allGroups) {
            const groupInfo = {
                groupid: g.groupid,
                groupName: g.groupName,
                description: g.description,
                CreatorID: g.CreatorID,
            };
            try {
                const members = await groupModelInstance.GroupMember.findAll({ where: { groupID: g.groupid } });
                if (!members || members.length === 0) {
                    // No members found; fallback to broadcasting to all (rare)
                    console.warn(`broadcastGroups: no members for group ${g.groupid}, broadcasting to all`);
                    io.emit("groups", [groupInfo]);
                    continue;
                }
                for (const m of members) {
                    const memberId = m && (m.memberID || (typeof m.getDataValue === 'function' ? m.getDataValue('memberID') : undefined));
                    if (!memberId) continue;
                    io.to(String(memberId)).emit("groups", [groupInfo]);
                }
                console.log(`Emitted group ${g.groupid} to ${members.length} members`);
            } catch (memberErr) {
                console.error('Error fetching group members for broadcast:', memberErr);
                io.emit("groups", [groupInfo]);
            }
        }
    } catch (err) {
        console.error('Error broadcasting groups:', err);
    }
};

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

    // call module-level broadcaster
    broadcastUserIds();
    broadcastGroups();

    // Ensure getMessages replies only to the requesting socket
    socket.on("getMessages", (data) => getMessages(socket, data));

    //sends a message to a specific user (by email or DB id)
    socket.on("sendMessage", sendMessage);

    // pass socket through so handler can ack back to the requesting socket
    socket.on("changeProfilePic", (data) => changeProfilePic(socket, data));

    // mark message as read
    socket.on("markAsRead", markAsRead);

    socket.on("createGroup", createGroup);

    socket.on("addGroupMember", addtoGroup);
    
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
    console.log("the msg is being sent to", receiverID)
    // Emit to the receiver's user room (prefer DB id, otherwise use email)
    if (groupID) {
        // Emit group message only to group members
        try {
            const groupModelInstance = new GroupModel(messagingDB);
            const groupMemberModel = groupModelInstance.GroupMember;
            const members = await groupMemberModel.findAll({ where: { groupID } });
            for (const m of members) {
                const memberId = m && (m.memberID || (typeof m.getDataValue === 'function' ? m.getDataValue('memberID') : undefined));
                if (!memberId) continue;
                const room = String(memberId);
                io.to(room).emit('receiveMessage', mappedData);
            }
            console.log("Message emitted to group members:", groupID, mappedData);
        } catch (groupErr) {
            console.error('Failed to emit group message to members, falling back to broadcast:', groupErr);
            io.emit('receiveMessage', mappedData);
        }
    } else {
        const receiverRoom = receiverID ? String(receiverID) : String(receiver);
        io.to(receiverRoom).emit("receiveMessage", mappedData);
        console.log("Message emitted to receiver room:", receiverRoom, mappedData);
    }
    // Emit to the sender's room so sender receives canonical message id
    const senderRoom = senderID ? String(senderID) : String(sender);
    io.to(senderRoom).emit("sentMessage", mappedData);
    console.log(mappedData);
};

export const getMessages = async (socket, data) => {
    try {
        const messageModel = new MessageModel(messagingDB);
        const senderID = data.from;
        const receiverID = data.to;
        const groupID = data.groupID || data.toGroupId || null;
        console.log("Fetching messages between", data.from, "and", data.to);
        let SentMessages = [];
        let ReceivedMessages = [];
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
                    from: type === 'sent' ? data.fromEmail : data.toEmail,
                    to: type === 'sent' ? data.toEmail : data.fromEmail,
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

            console.log('Marking group messages as read for', data.fromEmail, 'in group', groupID);
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
                from: data.fromEmail,
                to: data.toEmail,
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
                from: data.toEmail,
                to: data.fromEmail,
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
        socket.emit("previousMessages", mergedPayload);
        // Notify the other user (mark as read) using their DB id room if available
        console.log('Marking messages as read for', data.toEmail, 'to', data.fromEmail);
        if (receiverID) {
            io.to(String(receiverID)).emit("messageReadAck", { fromEmail: data.toEmail, toEmail: data.fromEmail });
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

            broadcastUserIds();

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

const createGroup = async (data) => {
    try {
        const groupName = data.groupName;
        const createdBy = data.createdBy;

        console.log(`Creating group: ${groupName} by userID: ${createdBy}`);
        const groupModelInstance = new GroupModel(messagingDB);
        const groupModel = groupModelInstance.getGroupModel();
        const groupMemberModel = groupModelInstance.GroupMember;

        const newGroup = await groupModelInstance.createGroup(groupName, '', createdBy);
            io.emit("newGroupCreated", { groupName, createdBy, groupID: newGroup.groupid });
            console.log(`Group created successfully: ${groupName} (ID: ${newGroup.groupid})`);

            // Broadcast updated group list to all connected clients
            try {
                await broadcastGroups();
            } catch (broadcastErr) {
                console.warn('Failed to broadcast groups after creation:', broadcastErr && broadcastErr.message);
            }

    } catch (err) {
        console.error('Error in createGroup:', err);
    }
};

const addtoGroup = async (data) => {
    try {
        const groupID = data.groupID;
        const memberID = data.memberID;

        console.log(`Adding memberID: ${memberID} to groupID: ${groupID}`);
        const groupModelInstance = new GroupModel(messagingDB);
        const groupMemberModel = groupModelInstance.GroupMember;

        await groupMemberModel.create({
            groupID: groupID,
            memberID: memberID,
            role: 'member'
        });

        console.log(`Member added successfully: memberID ${memberID} to groupID ${groupID}`);

    } catch (err) {
        console.error('Error in addtoGroup:', err);
    }
};




