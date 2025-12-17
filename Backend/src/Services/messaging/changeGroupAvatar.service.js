import { GroupModel } from "../../models/Group.model.js";
import { messagingDB } from '../../index.js';

export const changeGroupAvatarService = async (groupDTO) => {
    const groupID = groupDTO.groupID;
    const imageUrl = groupDTO.imageUrl;
    const requesterID = groupDTO.requesterID;

    if (!groupID) {
        return { error: 'Missing groupID' };
    }

    const groupModelInstance = new GroupModel(messagingDB);
    const groupMemberModel = groupModelInstance.GroupMember;

    if (!requesterID) {
        return { error: 'Unauthenticated' };
    }

    if (!imageUrl) {
        return { error: 'Missing imageUrl' };
    }

    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
        return { error: 'Invalid image URL' };
    }

    // Only members can change the group avatar
    const requester = await groupMemberModel.findOne({ where: { groupID, memberID: requesterID } });
    if (!requester) {
        return { error: 'You must be a group member to change the avatar' };
    }

    // Update group record in DB with new avatarUrl
    await groupModelInstance.getGroupModel().update(
        { groupAvatarUrl: imageUrl },
        { where: { groupid: groupID } }
    );

    return { success: true  };
}