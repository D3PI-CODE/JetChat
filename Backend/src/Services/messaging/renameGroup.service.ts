import { messagingDB } from '../../index.js';
import { GroupModel } from '../../models/Group.model.js';
import type { GroupDTO, ServiceResponse } from '../../types/index.js';


export const renameGroupService = async (groupDTO: GroupDTO): Promise<ServiceResponse> => {
    const groupID = groupDTO.groupID;
    const newName = groupDTO.newGroupName;
    const requesterId = groupDTO.requesterID;

    if (!requesterId) {
        return { error: 'Unauthenticated' };
    }
    
    try {
        const groupModelInstance = new GroupModel(messagingDB);
        const groupMemberModel = groupModelInstance.GroupMember;
        
        const requester = await groupMemberModel.findOne({ where: { groupID, memberID: requesterId } });
        if (!requester) {
            return { error: 'Only group members can rename the group.' };
        }
        
        await groupModelInstance.getGroupModel().update(
            { groupName: newName },
            { where: { groupid: groupID } }
        );
    } catch (dbErr: unknown) {
        console.error('Failed to rename group in DB:', dbErr);
        return { error: 'Failed to update DB', details: dbErr instanceof Error ? dbErr.message : String(dbErr) };
    }

    return { success: true };
}
