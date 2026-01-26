import type { Socket } from 'socket.io';
import { io, messagingDB } from '../index.js';
import { MessageModel } from '../models/message.model.js';
import { UserModel } from '../models/user.model.js';
import Cloudinary from '../config/CloudinaryInit.js';
import { GroupModel } from '../models/Group.model.js';
import { broadcastUserIds } from '../Services/socket/BroadcastUserIDs.service.js';
import { broadcastGroups } from '../Services/socket/BroadcastGroups.service.js';
import { markAsRead } from '../Services/socket/MarkAsRead.service.js';
import { sendMessage } from '../Services/socket/SendMessage.js';
import { mentionUserInGroup } from '../Services/socket/mentionUser.js';

const groupTypingMap = new Map<string, Map<string, { id: string | null; username: string | null }>>(); // groupID -> Map<senderKey, { id, username }>

interface CustomSocket extends Socket {
    userID?: string | null;
    email?: string | null;
}

export const connection = async (socket: CustomSocket) => {
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
    } catch (err: unknown) {
        console.error('Error resolving canonical user id for socket:', err);
    }

    // call module-level broadcaster
    broadcastUserIds(socket);
    broadcastGroups();


    // Typing indicator handlers
    socket.on('typingStart', async (data: any) => {
        try {
            const fromUserId = data && data.fromUserId;
            const fromEmail = data && data.fromEmail;
            const fromUsername = data && data.fromUsername;
            const groupID = data && data.groupID;

            // For group chats maintain a set and broadcast the current set to members
            if (groupID) {
                const key = String(groupID);
                let map = groupTypingMap.get(key);
                if (!map) { map = new Map(); groupTypingMap.set(key, map); }
                const senderKey = String(fromUserId || fromEmail || fromUsername || socket.userID || socket.email);
                map.set(senderKey, { id: fromUserId || fromEmail || null, username: fromUsername || fromEmail || null });

                // emit updated typing list to all group members (except the sender)
                try {
                    const groupModelInstance = new GroupModel(messagingDB);
                    const groupMemberModel = groupModelInstance.GroupMember;
                    const members = await groupMemberModel.findAll({ where: { groupID } });
                    const typingUsers = Array.from(map.values());
                    for (const m of members) {
                        const memberId = (m as any).memberID || (typeof (m as any).getDataValue === 'function' ? (m as any).getDataValue('memberID') : undefined);
                        if (!memberId) continue;
                        // skip sender
                        if (String(memberId) === String(senderKey)) continue;
                        try { io.to(String(memberId)).emit('typingUpdate', { groupID, typingUsers }); } catch (e) {}
                    }
                } catch (e: unknown) {
                    console.warn('typingStart: could not notify group members', e instanceof Error ? e.message : String(e));
                }
            } else {
                // Private chat: notify single recipient room (toEmail or toUserId must be provided)
                const toUserId = data && data.toUserId;
                const toEmail = data && data.toEmail;
                const receiverRoom = toUserId ? String(toUserId) : (toEmail ? String(toEmail) : null);
                if (receiverRoom) {
                    try {
                        io.to(receiverRoom).emit('typingUpdate', { chatKey: String(fromUserId || fromEmail || fromUsername || socket.userID || socket.email), typingUsers: [{ id: fromUserId || fromEmail || null, username: fromUsername || fromEmail || null }] });
                    } catch (e: unknown) { console.warn('typingStart private emit failed', e instanceof Error ? e.message : String(e)); }
                }
            }
        } catch (err: unknown) {
            console.error('Error in typingStart handler:', err instanceof Error ? err.message : String(err));
        }
    });

    socket.on('typingStop', async (data: any) => {
        try {
            const fromUserId = data && data.fromUserId;
            const fromEmail = data && data.fromEmail;
            const fromUsername = data && data.fromUsername;
            const groupID = data && data.groupID;

            if (groupID) {
                const key = String(groupID);
                const map = groupTypingMap.get(key);
                if (map) {
                    const senderKey = String(fromUserId || fromEmail || fromUsername || socket.userID || socket.email);
                    map.delete(senderKey);
                    const typingUsers = Array.from(map.values());
                    try {
                        const groupModelInstance = new GroupModel(messagingDB);
                        const groupMemberModel = groupModelInstance.GroupMember;
                        const members = await groupMemberModel.findAll({ where: { groupID } });
                        for (const m of members) {
                            const memberId = (m as any).memberID || (typeof (m as any).getDataValue === 'function' ? (m as any).getDataValue('memberID') : undefined);
                            if (!memberId) continue;
                            try { io.to(String(memberId)).emit('typingUpdate', { groupID, typingUsers }); } catch (e) {}
                        }
                    } catch (e: unknown) {
                        console.warn('typingStop: could not notify group members', e instanceof Error ? e.message : String(e));
                    }
                }
            } else {
                const toUserId = data && data.toUserId;
                const toEmail = data && data.toEmail;
                const receiverRoom = toUserId ? String(toUserId) : (toEmail ? String(toEmail) : null);
                if (receiverRoom) {
                    try {
                        io.to(receiverRoom).emit('typingUpdate', { chatKey: String(fromUserId || fromEmail || fromUsername || socket.userID || socket.email), typingUsers: [] });
                    } catch (e: unknown) { console.warn('typingStop private emit failed', e instanceof Error ? e.message : String(e)); }
                }
            }
        } catch (err: unknown) {
            console.error('Error in typingStop handler:', err instanceof Error ? err.message : String(err));
        }
    });

    socket.on("changeProfilePic", (data: any) => changeProfilePic(socket, data));

    socket.on("changeGroupAvatar", (data: any) => changeGroupAvatar(socket, data));
    // Mention user in a group
    socket.on('mentionUser', (data: any) => {
        try {
            mentionUserInGroup(socket, data);
        } catch (err: unknown) {
            console.error('Error handling mentionUser event:', err instanceof Error ? err.message : String(err));
        }
    });
    
    // Message send handler - persist and route messages
    socket.on('sendMessage', async (data: any) => {
        try {
            console.log('sendMessage event received from socket', socket.id, 'payload:', { groupID: data?.groupID, from: data?.fromEmail, to: data?.toEmail });
            await sendMessage(socket, data);
        } catch (err: unknown) {
            console.error('Error handling sendMessage event:', err instanceof Error ? err.message : String(err));
            try { socket.emit('sendMessageError', { error: err instanceof Error ? err.message : 'sendMessage failed' }); } catch (e) {}
        }
    });

    // Mark-as-read handler - update DB and notify peers
    socket.on('markAsRead', async (data: any) => {
        try {
            await markAsRead(data);
        } catch (err: unknown) {
            console.error('Error handling markAsRead event:', err instanceof Error ? err.message : String(err));
            try { socket.emit('markAsReadError', { error: err instanceof Error ? err.message : 'markAsRead failed' }); } catch (e) {}
        }
    });
    
    
    // When a socket disconnects, broadcast the updated list of user IDs
    socket.on('disconnect', () => {
        console.log("user disconnected: " + socket.id + " (userID: " + socket.userID + ")");
        // remove from any typing maps
        try {
            for (const [gid, map] of Array.from(groupTypingMap.entries())) {
                try {
                    const senderKey1 = String(socket.userID || socket.email || '');
                    if (map && map.delete && map.delete(senderKey1)) {
                        // notify remaining members about updated typing list
                        const typingUsers = Array.from(map.values());
                        (async () => {
                            try {
                                const groupModelInstance = new GroupModel(messagingDB);
                                const members = await groupModelInstance.GroupMember.findAll({ where: { groupID: gid } });
                                for (const m of members) {
                                    const memberId = (m as any).memberID || (typeof (m as any).getDataValue === 'function' ? (m as any).getDataValue('memberID') : undefined);
                                    if (!memberId) continue;
                                    try { io.to(String(memberId)).emit('typingUpdate', { groupID: gid, typingUsers }); } catch (e) {}
                                }
                            } catch (e) {}
                        })();
                    }
                } catch (e) {}
            }
        } catch (e) {}
        broadcastUserIds();
    });
};

export const changeProfilePic = async (socket: CustomSocket, data: any) => {
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
                width: 500,
                height: 500,
                crop: 'fill',
                fetch_format: 'auto',
                quality: 'auto',
                gravity: 'face',
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
        } catch (dbErr: unknown) {
            console.error('Failed to update user avatar in DB:', dbErr);
            socket.emit('profilePicUpdateError', { error: 'Failed to update DB', details: dbErr instanceof Error ? dbErr.message : String(dbErr) });
        }
    } catch (err: unknown) {
        console.error('Cloudinary upload error:', err);
        socket?.emit?.('profilePicUpdateError', { error: 'Cloudinary upload failed', details: err instanceof Error ? err.message : String(err) });
    }
}

const changeGroupAvatar = async (socket: CustomSocket, data: any) => {
    try {
        const groupID = data && data.groupID;
        if (!groupID) {
            try { socket.emit('changeGroupAvatarError', { error: 'Missing groupID' }); } catch (e) {}
            return;
        }
        const groupModelInstance = new GroupModel(messagingDB);
        const groupMemberModel = groupModelInstance.GroupMember;

        const requesterId = socket.userID || socket.email;
        if (!requesterId) {
            socket.emit('changeGroupAvatarError', { error: 'Unauthenticated' });
            return;
        }

        // Only members can change the group avatar
        const requester = await groupMemberModel.findOne({ where: { groupID, memberID: requesterId } });
        if (!requester) {
            socket.emit('changeGroupAvatarError', { error: 'You must be a group member to change the avatar' });
            return;
        }

        // Upload new avatar to Cloudinary
        let payload = data.imageData && typeof data.imageData === 'string' ? data.imageData.trim() : '';
        const base64Only = /^[A-Za-z0-9+/]+={0,2}$/.test(payload) && !payload.startsWith('data:');
        if (base64Only) {
            payload = `data:image/jpeg;base64,${payload}`;
        }

        console.log(`Uploading new avatar for groupID: ${groupID} by memberID: ${requesterId}`);
        const result = await Cloudinary.uploader.upload(payload, {
            folder: 'group_avatars',
            resource_type: 'image',
        });
        console.log('Cloudinary upload result for group avatar:', { public_id: result?.public_id, secure_url: result?.secure_url });
        const imageUrl = result?.secure_url;
        if (!imageUrl) {
            throw new Error('Cloudinary did not return a secure_url for group avatar');
        }

        // Update group record in DB with new avatarUrl
        await groupModelInstance.getGroupModel().update(
            { groupAvatarUrl: imageUrl },
            { where: { groupid: groupID } }
        );
        socket.emit('changeGroupAvatarSuccess', { groupID, groupAvatarUrl: imageUrl, groupAvatar: imageUrl });
        // Also emit globally so clients that may not receive the per-member `groups` broadcast
        // update their UI immediately. broadcastGroups will also run below.
        try {
            io.emit('changeGroupAvatarSuccess', { groupID, groupAvatarUrl: imageUrl, groupAvatar: imageUrl });
        } catch (e: unknown) {
            console.warn('Global emit changeGroupAvatarSuccess failed:', e instanceof Error ? e.message : String(e));
        }
        console.log(`Group avatar updated successfully: groupID ${groupID}`);

        // Broadcast updated groups to all connected clients
        try {
            await broadcastGroups();
        } catch (broadcastErr: unknown) {
            console.warn('Failed to broadcast groups after changing avatar:', broadcastErr instanceof Error ? broadcastErr.message : String(broadcastErr));
        }

    } catch (err: unknown) {
        console.error('Error in changeGroupAvatar:', err);
        try { socket.emit('changeGroupAvatarError', { error: err instanceof Error ? err.message : 'changeGroupAvatar failed' }); } catch (e) {}
    }
};





