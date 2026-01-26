import { messagingDB } from '../../index.js';
import { GroupModel } from '../../models/Group.model.js';
import type { GroupDTO, ServiceResponse } from '../../types/index.js';

export const changeGroupMemberRoleService = async (groupDTO: GroupDTO): Promise<ServiceResponse> => {
    const groupID = groupDTO.groupID;
    const newRole = groupDTO.newRole;
    const memberID = groupDTO.memberID;
    const requesterID = groupDTO.requesterID;

    if (!requesterID) {
        return { error: 'Unauthenticated' }
    }

    if (!newRole || !['member', 'admin'].includes(newRole.toLowerCase())) {
            return { error: 'Invalid role specified' };
    }

    try {
        const groupModelInstance = new GroupModel(messagingDB);
        const groupMemberModel = groupModelInstance.GroupMember;
        
        // Ensure requester is a group member with admin/owner privileges
        const requester = await groupMemberModel.findOne({ where: { groupID, memberID: requesterID } });
        if (!requester) {
            return { error: 'You are not a member of this group' };
        }
        if (!(requester.role === 'admin' || requester.role === 'owner')) {
            return { error: 'Insufficient permissions' };
        }

        // Do not allow changing your own role via this action
        if (String(requesterID) === String(memberID)) {
            return { error: 'Cannot change your own role' };
        }

        // Fetch target member record
        const target = await groupMemberModel.findOne({ where: { groupID, memberID } });
        if (!target) {
            return { error: 'Target user is not a member of this group' };
        }

        // Do not allow changing the owner role or assigning owner
        if (target.role === 'owner') {
            return { error: 'Cannot change owner role' };
        }
        if (newRole === 'owner') {
            return { error: 'Cannot assign owner role' };
        }

        console.log(`Changing role for memberID: ${memberID} in groupID: ${groupID} to role: ${newRole} (requested by ${requesterID})`);

        await groupMemberModel.update(
            { role: newRole.toLowerCase() },
            { where: { groupID: groupID, memberID: memberID } }
        );
    } catch (dbErr: unknown) {
        console.error('Failed to change group member role in DB:', dbErr);
        return { error: 'Failed to update DB', details: dbErr instanceof Error ? dbErr.message : String(dbErr) };
    }

    return { success: true };
}
