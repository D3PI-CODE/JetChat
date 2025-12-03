
import { verifyToken } from './tokenAuth.js';

export const socketAuth = (socket, next) => {
    const auth = socket.handshake.auth || {};
    const token = auth.token || null;
    const providedUserID = auth.userID || null;
    const providedEmail = auth.email || null;

    // If token provided, verify using the shared helper from tokenAuth
    if (token) {
        try {
            const payload = verifyToken(token);
            const idFromToken = payload.userId || payload.id || payload.sub || null;
            const emailFromToken = payload.email || payload.username || null;
            socket.userID = idFromToken || providedUserID || emailFromToken || providedEmail || null;
            socket.email = emailFromToken || providedEmail || null;
            if (!socket.userID && !socket.email) {
                return next(new Error('Token verified but contained no usable id/email'));
            }
            return next();
        } catch (err) {
            console.warn('Socket token verification failed:', err && err.message);
            return next(new Error('Invalid authentication token'));
        }
    }

    // No token: fall back to provided handshake values
    if (!providedUserID && !providedEmail) {
        return next(new Error('User ID or email is required for persistent connections'));
    }
    socket.userID = providedUserID || providedEmail;
    socket.email = providedEmail || null;
    next();
};