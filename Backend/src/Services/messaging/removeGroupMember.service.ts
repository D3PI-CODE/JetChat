import { GroupModel } from '../../models/Group.model.js';
import type { GroupDTO, ServiceResponse } from '../../types/index.js';
import { messagingDB } from '../../index.js';

export const removeGroupMemberService = async (groupDTO: GroupDTO): Promise<ServiceResponse> => {
    const groupID = groupDTO.groupID;
    const memberID = groupDTO.memberID;
    const requesterID = groupDTO.requesterID;

    if (!requesterID) {
        return { error: 'Unauthenticated' };
    }

    try {
        const groupModelInstance = new GroupModel(messagingDB);
        const groupMemberModel = groupModelInstance.GroupMember;

        const requester = await groupMemberModel.findOne({ where: { groupID, memberID: requesterID } });
        if (!requester) {
            return { error: 'You are not a member of this group' };
        }

        // Only admins or owners may remove other members
        if (!(requester.role === 'admin' || requester.role === 'owner')) {
            return { error: 'Insufficient permissions to remove members' };
        }

        // Prevent removing the owner
        const target = await groupMemberModel.findOne({ where: { groupID, memberID } });
        if (!target) {
            return { error: 'Target user is not a member of this group' };
        }
        if (target.role === 'owner') {
            return { error: 'Cannot remove owner' };
        }

        await groupMemberModel.destroy({ where: { groupID: groupID, memberID: memberID } });
    } catch (dbErr: unknown) {
        console.error('Failed to remove group member in DB:', dbErr);
        return { error: 'Failed to update DB', details: dbErr instanceof Error ? dbErr.message : String(dbErr) };
    }
    
    return { success: true };
}
