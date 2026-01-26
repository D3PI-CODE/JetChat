import { io } from '../index.js';
import { getMessagesService } from '../Services/messaging/getMessage.service.js';
import { createGroupService } from '../Services/messaging/createGroup.service.js';
import { broadcastGroups } from '../Services/socket/BroadcastGroups.service.js';
import { deleteGroupService } from '../Services/messaging/deleteGroup.service.js';
import { renameGroupService } from '../Services/messaging/renameGroup.service.js';
import { addGroupMemberService } from '../Services/messaging/addGroupMember.service.js';
import { changeGroupMemberRoleService } from '../Services/messaging/changeGroupMemberRole.service.js';
import { leaveGroupService } from '../Services/messaging/leaveGroup.service.js';
import { removeGroupMemberService } from '../Services/messaging/removeGroupMember.service.js';
import { changeProfilePicService } from '../Services/messaging/changeProfilePic.service.js';
import { changeGroupAvatarService } from '../Services/messaging/changeGroupAvatar.service.js';
import { broadcastUserIds } from '../Services/socket/broadcastUserIds.service.js';

export const getMessages = async (req, res) => {
    try {
        // Support both GET (query) and POST (body) callers by merging query into body
        const userDTO = { ...req.body, ...req.query };
        const senderID = userDTO.from
        const receiverID = userDTO.to 
        const groupID = userDTO.groupID 
        const fromEmail = userDTO.fromEmail 
        const toEmail = userDTO.toEmail 
        console.log("Fetching messages between", senderID || fromEmail, "and", receiverID || toEmail, "groupID", groupID);

        if (!senderID || !receiverID) {
            if (!groupID) {
                return res.status(400).json({ error: 'Missing sender or receiver identifiers' });
            }
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

        if (newGroup.error) {
            return res.status(403).json({ error: newGroup.error });
        } else {
            res.json({ message: `Group "${groupName}" created successfully.`, groupID: newGroup.groupID });
            console.log(`Group "${groupName}" created by userID: ${createdBy}`);
        }

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

export const deleteGroup = async (req, res) => {
    try {
        const groupDTO = { ... req.body }
        const groupID = groupDTO.groupID;
        const requesterId = groupDTO.requesterId;

        if (!groupID && !requesterId) {
            return res.status(400).json({ error: 'Missing groupID or requesterId' });
        }
        const deleteResult = await deleteGroupService(groupDTO);

        if (deleteResult.error) {
            return res.status(403).json({ error: deleteResult.error });
        } else {
            res.json({ message: `Group with ID ${groupID} deleted successfully.` });
            console.log(`Group with ID ${groupID} deleted by requesterId ${requesterId}`);
        }

        try { 
            await broadcastGroups(); 
        } catch (bErr) { 
            res.status(500).json({ error: 'Group deleted but broadcasting failed: ' + (bErr && bErr.message) }); 
            return;
        }

    } catch (err) {
        console.error('Error in deleteGroup:', err);
        res.status(500).json({ error: err && err.message || 'deleteGroup failed' });
    }
};

export const renameGroup = async (req, res) => {
    try {
        const groupDTO = { ... req.body }
        const groupID = groupDTO.groupID;
        const newName = groupDTO.newGroupName;
        
        if (!groupID || !newName) {
            res.status(400).json({ error: 'Missing groupID or newGroupName' });
            return;
        }
        const renameResult = await renameGroupService(groupDTO);

        if (renameResult.error) {
            return res.status(403).json({ error: renameResult.error });
        } else {
            res.json({ message: `Group with ID ${groupID} renamed successfully to ${newName}.` });
            console.log(`Group with ID ${groupID} renamed to ${newName}`);
        }

        try {
            await broadcastGroups();
        } catch (broadcastErr) {
            return res.status(500).json({ error: 'Group renamed but broadcasting failed: ' + (broadcastErr && broadcastErr.message) });
        }
        
    } catch (err) {
        console.error('Error in renameGroup:', err);
        res.status(500).json({ error: err && err.message || 'renameGroup failed' });
    }
};

export const addGroupMember = async (req, res) => {
    try {
        const groupDTO = { ... req.body }
        const groupID = groupDTO.groupID;
        const memberID = groupDTO.memberID;

        if (!groupID || !memberID) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const addMemberResult = await addGroupMemberService(groupDTO);

        if (addMemberResult && addMemberResult.error) {
            return res.status(403).json({ error: addMemberResult.error });
        } else {
            res.json({ message: `Member with ID ${memberID} added to group ${groupID} successfully.` });
            console.log(`Member with ID ${memberID} added to group ${groupID}`);
        }

        try { 
            await broadcastGroups(); 
        } catch (bErr) {
            return res.status(500).json({ error: 'Member added but broadcasting failed: ' + (bErr && bErr.message) }); 
        }

    } catch (err) {
        console.error('Error in addtoGroup:', err);
        res.status(500).json({ error: err && err.message || 'addtoGroup failed' });
    }
};

export const changeGroupMemberRole = async (req, res) => {
    try {
        const groupDTO = { ... req.body }
        const groupID = groupDTO.groupID;
        const newRole = groupDTO.newRole;
        const memberID = groupDTO.memberID;
        const requesterID = groupDTO.requesterID;

        if (!groupID || !newRole || !memberID || !requesterID) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const changeRoleResult = await changeGroupMemberRoleService(groupDTO);

        if (changeRoleResult && changeRoleResult.error) {
            return res.status(403).json({ error: changeRoleResult.error });
        } else {
            res.json({ message: `Member with ID ${memberID} role changed to ${newRole} in group ${groupID} successfully.` });
            console.log(`Member with ID ${memberID} role changed to ${newRole} in group ${groupID}`);
        }

        // Broadcast updated groups to affected users so their lists update immediately
        try {
            await broadcastGroups();
        } catch (bErr) {
            return res.status(500).json({ error: 'Role changed but broadcasting failed: ' + (bErr && bErr.message) });
        }

    } catch (err) {
        console.error('Error in changeRole:', err);
        res.status(500).json({ error: err && err.message || 'changeRole failed' });
    }
};

export const leaveGroup = async (req, res) => {
    try {
        const groupDTO = { ... req.body }
        const groupID = groupDTO.groupID;
        const requesterID = groupDTO.requesterID;

        if (!groupID || !requesterID) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        console.log(`MemberID: ${requesterID} leaving groupID: ${groupID}`);
        const leaveGroupResult = await leaveGroupService(groupDTO);

        if (leaveGroupResult && leaveGroupResult.error) {
            return res.status(403).json({ error: leaveGroupResult.error });
        } else {
            res.json({ message: `Member with ID ${requesterID} left group ${groupID} successfully.` });
            console.log(`Member with ID ${requesterID} left group ${groupID}`);
        }

        try {
            await broadcastGroups();
        } catch (bErr) {
            return res.status(500).json({ error: 'Left group but broadcasting failed: ' + (bErr && bErr.message) });
        }
    } catch (err) {
        return res.status(500).json({ error: err && err.message || 'leaveGroup failed' });
    }
};

export const removeGroupMember = async (req, res) => {
    try {
        const groupDTO = { ... req.body }
        const groupID = groupDTO.groupID;
        const memberID = groupDTO.memberID;
        const requesterID = groupDTO.requesterID;

        if (!groupID || !memberID || !requesterID) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const removeMemberResult = await removeGroupMemberService(groupDTO);

        if (removeMemberResult && removeMemberResult.error) {
            return res.status(403).json({ error: removeMemberResult.error });
        } else {
            res.json({ message: `Member with ID ${memberID} removed from group ${groupID} successfully.` });
            console.log(`Member with ID ${memberID} removed from group ${groupID} by requesterID ${requesterID}`);
        }

        // Broadcast updated groups to affected users so their lists update immediately
        try { 
            await broadcastGroups(); 
        } catch (bErr) {
            return res.status(500).json({ error: 'Member removed but broadcasting failed: ' + (bErr && bErr.message) });
        }

    } catch (err) {
        console.error('Error in removeFromGroup:', err);
        return res.status(500).json({ error: err && err.message || 'removeFromGroup failed' });
    }
}

export const changeProfilePic = async (req, res) => {
    try {
        const userDTO = { ... req.body }
        const requesterID = userDTO.requesterID;

        const changePicResult = await changeProfilePicService(userDTO);

        if (changePicResult && changePicResult.error) {
            return res.status(403).json({ error: changePicResult.error });
        } else {
            res.json({ message: `Profile picture updated successfully for userID ${requesterID}.` });
            console.log(`Profile picture updated successfully for userID ${requesterID}`);
        }

        try {
            broadcastUserIds();
        } catch (dbErr) {
            console.error('Failed to update user avatar in DB:', dbErr);
            return res.status(500).json({ error: 'Failed to broadcast user updates', details: dbErr.message });
        }
    } catch (err) {
        console.error('Cloudinary upload error:', err);
        return res.status(500).json({ error: err && err.message || 'changeProfilePic failed' });
    }
}

export const changeGroupAvatar = async (req, res) => {
    try {
        const groupDTO = { ... req.body }
        const groupID = groupDTO.groupID;

        const changeAvatarResult = await changeGroupAvatarService(groupDTO);

        if (changeAvatarResult && changeAvatarResult.error) {
            return res.status(403).json({ error: changeAvatarResult.error });
        } else {
            res.json({ message: `Group avatar updated successfully for groupID ${groupID}.` });
            console.log(`Group avatar updated successfully for groupID ${groupID}`);
        }

        // Broadcast updated groups to all connected clients
        try {
            await broadcastGroups();
        } catch (broadcastErr) {
            return res.status(500).json({ error: 'Group avatar changed but broadcasting failed: ' + (broadcastErr && broadcastErr.message) });
        }

    } catch (err) {
        console.error('Error in changeGroupAvatar:', err);
        return res.status(500).json({ error: err && err.message || 'changeGroupAvatar failed' });
    }
}