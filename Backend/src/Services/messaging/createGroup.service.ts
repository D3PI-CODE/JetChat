import { messagingDB } from '../../index.js';
import { GroupModel } from '../../models/Group.model.js';
import type { GroupDTO, ServiceResponse } from '../../types/index.js';

export const createGroupService = async (groupDTO: GroupDTO): Promise<ServiceResponse & { groupID?: any }> => {
    const groupName = groupDTO.groupName;
    const createdBy = groupDTO.createdBy;

    if (!createdBy) {
        return { error: 'Unauthenticated' };
    }
    
    if (!groupName || groupName.trim() === '') {
        return { error: 'Group name cannot be empty' };
    }
    
    try {
        console.log(`Creating group: ${groupName} by userID: ${createdBy}`);
        const groupModelInstance = new GroupModel(messagingDB);
        const newGroup = await groupModelInstance.createGroup(groupName, '', createdBy);
        return { success: true, groupID: newGroup.groupid };
    } catch (dbErr: unknown) {
        console.error('Failed to create group in DB:', dbErr);
        const message = dbErr instanceof Error ? dbErr.message : String(dbErr);
        return { error: 'Failed to create group', details: message };
    }
}
