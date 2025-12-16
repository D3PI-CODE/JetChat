import { io, messagingDB } from '../../index.js';
import { UserModel } from '../../models/user.model.js';
import redisClient from '../../config/RedisInit.js';

export const broadcastUserIds = async (socket) => {
    try {
        const userModel = new UserModel(messagingDB);
        const allUsers = await userModel.getUserModel().findAll({ raw: true });
        try {
            await redisClient.del("user:online");
        } catch (e) {
            console.warn('Redis DEL user:online failed:', e && e.message);
        }
        for (const s of Array.from(io.of("/").sockets.values())) {
            try {
                if (s.userID) await redisClient.SADD("user:online", String(s.userID));
                else if (s.email) await redisClient.SADD("user:online", s.email);
            } catch (e) {
                console.warn('Redis SADD failed for user presence:', e && e.message);
            }
        }

        const userArr = await Promise.all((allUsers || []).map(async u => ({
            id: u.id,
            email: u.email,
            username: u.username ?? u.email,
            avatarUrl: u.avatarUrl || null,
            online: await redisClient.SISMEMBER("user:online", String(u.id)) === 1 ? true : false,
        })));
        
        console.log("Broadcasting users (with online status):", userArr);
        io.emit("users", userArr);
    } catch (err) {
        console.error('Error broadcasting users:', err);
    }
};