import { messagingDB } from '../../index.js';
import { GroupModel } from '../../models/Group.model.js';

export const addGroupMemberService = async (groupDTO) => {
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
            return { error: 'You must be a group member to add others' };
        }

        // Prevent duplicate membership
        const existing = await groupMemberModel.findOne({ where: { groupID, memberID } });
        if (existing) {
            return { error: 'User is already a member of the group.' };
        }

        const created = await groupMemberModel.create({ groupID: groupID, memberID: memberID, role: 'member' });
    } catch (dbErr) {
        console.error('Failed to add group member in DB:', dbErr);
        return { error: 'Failed to add member', details: dbErr.message };
    }
    
    return { success: true, member: created };

};