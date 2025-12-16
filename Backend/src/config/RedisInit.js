import redis from 'redis';

// Create client with basic reconnect strategy
const redisClient = redis.createClient();

redisClient.on('error', (err) => console.warn('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis client connecting...'));
redisClient.on('ready', () => console.log('Redis client ready'));

const EXPIRY_TIME = 3600; // 1 hour in seconds

export async function redisHSetOrGet(key, field, cb) {
    try {
        const existing = await redisClient.hGet(key, field);
        if (existing !== null && existing !== undefined) {
            return existing;
        }
        const value = await cb();
        // convert non-string values to JSON
        const storeValue = typeof value === 'string' ? value : JSON.stringify(value);
        await redisClient.hSetEx(key, field, storeValue, EXPIRY_TIME);
        return storeValue;
    } catch (err) {
        console.error('Redis hashSetOrGet error:', err);
        return await cb();
    }
}

export async function redisSetOrGet(key, cb) {
    try {
        const existing = await redisClient.get(key);
        if (existing !== null && existing !== undefined) {
            return existing;
        }
        const value = await cb();
        // convert non-string values to JSON
        const storeValue = typeof value === 'string' ? value : JSON.stringify(value);
        await redisClient.setEx(key, EXPIRY_TIME, storeValue);
        return storeValue;
    } catch (err) {
        console.error('Redis SetOrGet error:', err);
        return await cb();
    }
}

export const redisInitialization = async () => {
    try {
    if (redisClient && !redisClient.isOpen) {
        await redisClient.connect();
    }
    } catch (err) {
    console.warn('Redis connect failed at startup:', err && err.message ? err.message : err);
    }
}

export default redisClient;

