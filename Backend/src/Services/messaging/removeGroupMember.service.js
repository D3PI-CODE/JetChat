import { GroupModel } from '../../models/Group.model.js';
import { messagingDB } from '../../index.js';

export const removeGroupMemberService = async (groupDTO) => {
    const groupID = groupDTO.groupID;
    const memberID = groupDTO.memberID;
    const requesterID = groupDTO.requesterID;

    const groupModelInstance = new GroupModel(messagingDB);
    const groupMemberModel = groupModelInstance.GroupMember;

    if (!requesterID) {
        return { error: 'Unauthenticated' };
    }

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

    return { success: true };
}
