import { io } from '../index.js';
import { getMessagesService } from '../Services/messaging/getMessage.service.js';
import { createGroupService } from '../Services/messaging/createGroup.service.js';
import { broadcastGroups } from '../Services/socket/BroadcastGroups.service.js';

export const getMessages = async (req, res) => {
    try {
        const userDTO = {... req.body}
        const senderID = userDTO.from
        const receiverID = userDTO.to 
        const groupID = userDTO.groupID 
        const fromEmail = userDTO.fromEmail 
        const toEmail = userDTO.toEmail 
        console.log("Fetching messages between", senderID || fromEmail, "and", receiverID || toEmail, "groupID", groupID);

        if (!groupID && (!senderID || !receiverID)) {
            return res.status(400).json({ error: 'Missing sender or receiver identifiers' });
        }

        const mergedPayload = await getMessagesService(userDTO);

        res.json({ messages: mergedPayload });
        if (receiverID) {
            io.to(String(receiverID)).emit("messageReadAck", { fromEmail: toEmail, toEmail: fromEmail });
        }
    } catch (err) {
        console.error('Error in getMessages:', err);
        res.json({ error: err && err.message || 'getMessages failed' });
    }
};

export const createGroup = async (req, res) => {
    try {
        const groupDTO = { ... req.body }
        const groupName = groupDTO.groupName;
        const createdBy = groupDTO.createdBy;
        
        const newGroup = await createGroupService(groupDTO);

        res.json({ groupName, createdBy, groupID: newGroup.groupid });
        console.log(`Group created successfully: ${groupName} (ID: ${newGroup.groupid})`);

        // Broadcast updated group list to all connected clients
        try {
            await broadcastGroups();
        } catch (broadcastErr) {
            res.status(500).json({ error: 'Group created but broadcasting failed: ' + (broadcastErr && broadcastErr.message) });
            return;
        }

    } catch (err) {
        console.error('Error in createGroup:', err);
        res.status(500).json({ error: err && err.message || 'createGroup failed' });
    }
};