import { messagingDB } from '../../index.js';
import { GroupModel } from '../../models/Group.model.js';

export const deleteGroupService = async (groupDTO) => {
    const groupID = groupDTO.groupID;
    const requesterId = groupDTO.requesterId;

    const groupModelInstance = new GroupModel(messagingDB);
    const groupMemberModel = groupModelInstance.GroupMember;
    const requester = await groupMemberModel.findOne({ where: { groupID, memberID: requesterId } });

    if (!requester || requester.role !== 'owner') {
        return { error: 'Only group owners can delete the group.' };
    }
    
    try{
        await groupModelInstance.deleteGroup(groupID);
    } catch (err){
        return { error: 'Failed to delete group: ' + (err && err.message) };
    }
    
    return { success: true };
}