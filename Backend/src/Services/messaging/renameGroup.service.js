import { messagingDB } from '../../index.js';
import { GroupModel } from '../../models/Group.model.js';


export const renameGroupService = async (groupDTO) => {
    const groupID = groupDTO.groupID;
    const newName = groupDTO.newGroupName;
    const requesterId = groupDTO.requesterId;
    
    const groupModelInstance = new GroupModel(messagingDB);
    const groupMemberModel = groupModelInstance.GroupMember;
    if (!requesterId) {
        return { error: 'Unauthenticated' };
    }
    
    const requester = await groupMemberModel.findOne({ where: { groupID, memberID: requesterId } });
    if (!requester) {
        return { error: 'Only group members can rename the group.' };
    }
    
    await groupModelInstance.getGroupModel().update(
        { groupName: newName },
        { where: { groupid: groupID } }
    );

    return { success: true };
}