import { io, messagingDB } from '../../index.js';
import { UserModel } from '../../models/user.model.js';
import redisClient from '../../config/RedisInit.js';

export const broadcastUserIds = async (socket: any): Promise<void> => {
    try {
        const userModel = new UserModel(messagingDB);
        const allUsers = await userModel.getUserModel().findAll({ raw: true });
        try {
            await redisClient.del("user:online");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.warn('Redis DEL user:online failed:', message);
        }
        for (const s of Array.from(io.of("/").sockets.values())) {
            try {
                const socket = s as any;
                if (socket.userID) await redisClient.SADD("user:online", String(socket.userID));
                else if (socket.email) await redisClient.SADD("user:online", socket.email);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                console.warn('Redis SADD failed for user presence:', message);
            }
        }

        const userArr = await Promise.all((allUsers || []).map(async (u: any) => ({
            id: u.id,
            email: u.email,
            username: u.username ?? u.email,
            avatarUrl: u.avatarUrl || null,
            online: await redisClient.SISMEMBER("user:online", String(u.id)) === 1 ? true : false,
        })));
        
        console.log("Broadcasting users (with online status):", userArr);
        io.emit("users", userArr);
    } catch (err: unknown) {
        console.error('Error broadcasting users:', err);
    }
};
