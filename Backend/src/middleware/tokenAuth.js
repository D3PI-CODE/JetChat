import jwt from 'jsonwebtoken';

export const tokenAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.sendStatus(401);
    }

    const JWT_SECRET = process.env.JWT_SECRET;

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
}   

// Helper to verify a JWT and return its payload. Throws on failure.
export const verifyToken = (token) => {
    if (!token) throw new Error('No token provided');
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
    // jwt.verify can throw synchronously; let caller handle errors
    return jwt.verify(token, JWT_SECRET);
}