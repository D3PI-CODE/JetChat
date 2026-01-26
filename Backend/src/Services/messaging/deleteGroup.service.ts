import { messagingDB } from '../../index.js';
import { GroupModel } from '../../models/Group.model.js';
import type { GroupDTO, ServiceResponse } from '../../types/index.js';

export const deleteGroupService = async (groupDTO: GroupDTO): Promise<ServiceResponse> => {
    const groupID = groupDTO.groupID;
    const requesterId = groupDTO.requesterId;

    if (!groupID) {
        return { error: 'Missing groupID' };
    }

    if (!requesterId) {
        return { error: 'Missing requester ID' };
    }

    try {
        const groupModelInstance = new GroupModel(messagingDB);
        const groupMemberModel = groupModelInstance.GroupMember;
        const requester = await groupMemberModel.findOne({ where: { groupID, memberID: requesterId } });

        if (!requester || requester.role !== 'owner') {
            return { error: 'Only group owners can delete the group.' };
        }
        
        await groupModelInstance.deleteGroup(groupID);
    } catch (err: unknown){
        const message = err instanceof Error ? err.message : String(err);
        return { error: 'Failed to delete group: ' + message };
    }
    
    return { success: true };
}
