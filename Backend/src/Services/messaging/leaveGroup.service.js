import { messagingDB } from '../../index.js';
import { GroupModel } from '../../models/Group.model.js';

export const leaveGroupService = async (groupDTO) => {
    const groupID = groupDTO.groupID;
    const requesterID = groupDTO.requesterID;

    if (!requesterID) {
        return { error: 'Unauthenticated' };
    }

    const groupModelInstance = new GroupModel(messagingDB);
    const groupMemberModel = groupModelInstance.GroupMember;

    const requester = await groupMemberModel.findOne({ where: { groupID, memberID: requesterID } });
    if (!requester) {
        return { error: 'You are not a member of this group' };
    }

    if (requester.role === 'owner') {
        return { error: 'Owner cant leave the group' };
    }

    await groupMemberModel.destroy({
        where: { groupID: groupID, memberID: requesterID }
    })

    return { success: true };
}