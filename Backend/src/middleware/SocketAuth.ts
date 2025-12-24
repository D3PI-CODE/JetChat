import type { Socket } from 'socket.io';
import { verifyToken } from './tokenAuth.js';

interface authSocket extends Socket {
    userID?: string | null;
    email?: string | null;
}

export const socketAuth = (socket: authSocket, next: (err?: Error) => void) => {
    const auth = socket.handshake.auth || {};
    const token = auth.token || null;
    const providedUserID = auth.userID || null;
    const providedEmail = auth.email || null;

    // If token provided, verify using the shared helper from tokenAuth
    if (token) {
        try {
            const payload = verifyToken(token);
            const idFromToken = payload.userId
            const emailFromToken = payload.email
            socket.userID = idFromToken || providedUserID || emailFromToken || providedEmail || null;
            socket.email = emailFromToken || providedEmail || null;
            if (!socket.userID && !socket.email) {
                return next(new Error('Token verified but contained no usable id/email'));
            }
            return next();
        } catch (err: any) {
            console.warn('Socket token verification failed:', err && err.message);
            return next(new Error('Invalid authentication token'));
        }
    }

    // No token: fall back to provided handshake values
    if (!providedUserID && !providedEmail) {
        return next(new Error('User ID or email is required for persistent connections'));
    }
        socket.userID = providedUserID || null;
    socket.email = providedEmail || null;
    next();
};