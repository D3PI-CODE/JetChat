import { messagingDB } from '../../index.js';
import { GroupModel } from '../../models/Group.model.js';

export const createGroupService = async (groupDTO) => {
    const groupName = groupDTO.groupName;
    const createdBy = groupDTO.createdBy;
    
    console.log(`Creating group: ${groupName} by userID: ${createdBy}`);
    const groupModelInstance = new GroupModel(messagingDB);
    const newGroup = await groupModelInstance.createGroup(groupName, '', createdBy);

    return newGroup;
}