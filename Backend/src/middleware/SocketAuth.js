
export const socketAuth = (socket, next) => {
    const userID = socket.handshake.auth.userID;
    const email = socket.handshake.auth.email;
    // Allow email as a fallback identifier so clients that only provide email
    // won't be rejected at handshake time. The connection handler will try
    // to resolve the canonical DB id and join the appropriate room.
    if (!userID && !email) {
        return next(new Error("User ID or email is required for persistent connections"));
    }
    // Prefer explicit userID (DB id), otherwise use email as temporary id
    socket.userID = userID;
    socket.email = email;
    next();
};