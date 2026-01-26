import { UserModel } from '../../models/user.model.js';
import { messagingDB } from '../../index.js';


export const changeProfilePicService = async (userDTO) => {
    
    const requesterID = userDTO.requesterID;
    const imageUrl = userDTO.imageUrl;

    if (!requesterID) {
        return { error: 'Unauthenticated' };
    }

    if (!imageUrl) {
        return { error: 'No image URL provided' };
    }

    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
        return { error: 'Invalid image URL' };
    }

    try{
        const userModel = new UserModel(messagingDB);
        await userModel.getUserModel().update({ avatarUrl: imageUrl }, { where: { id: requesterID } });
    } catch (dbErr) {
        console.error('Failed to update user avatar in DB:', dbErr);
        return { error: 'Failed to update DB', details: dbErr.message };
    }

    return { success: true };
}