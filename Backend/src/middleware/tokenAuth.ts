import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction} from 'express';
import type { JwtPayload } from 'jsonwebtoken';

export const tokenAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No authorization token provided' });
    }

    const JWT_SECRET: string = process.env.JWT_SECRET as string;
    
    jwt.verify(token, JWT_SECRET, (err, payload) => {
        if (err) {
            console.error('tokenAuth verify error:', err && err.message);
            return res.status(403).json({ error: 'Invalid or expired token', details: err && err.message });
        }
        const p = (payload || {}) as any;
        const normalized = {
            id: p.id || p.userId || p.sub || null,
            email: p.email || p.em || p.mail || null,
            _raw: p,
        };
        (req as any).user = normalized;
        next();
    });
}   

// Helper to verify a JWT and return its payload. Throws on failure.
export const verifyToken = (token: string): JwtPayload => {
    if (!token) throw new Error('No token provided');
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
    // jwt.verify can throw synchronously; let caller handle errors
        const payload = jwt.verify(token, JWT_SECRET) as any;
        return {
            id: payload.id || payload.userId || payload.sub || null,
            email: payload.email || payload.em || payload.mail || null,
            _raw: payload,
        };
}