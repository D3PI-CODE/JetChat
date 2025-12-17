import { messagingDB } from '../../index.js';
import { GroupModel } from '../../models/Group.model.js';

export const createGroupService = async (groupDTO) => {
    const groupName = groupDTO.groupName;
    const createdBy = groupDTO.createdBy;
    
    try {
        console.log(`Creating group: ${groupName} by userID: ${createdBy}`);
        const groupModelInstance = new GroupModel(messagingDB);
        const newGroup = await groupModelInstance.createGroup(groupName, '', createdBy);
    } catch (dbErr) {
        console.error('Failed to create group in DB:', dbErr);
        return { error: 'Failed to create group', details: dbErr.message };
    }

    return newGroup;
}