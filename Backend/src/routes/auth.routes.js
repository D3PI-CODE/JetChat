import express, { response } from 'express';
import { login, register, validateToken } from '../controllers/auth.controllers.js';
import { tokenAuth } from '../middleware/tokenAuth.js';

const authRouter = express.Router();

authRouter.post('/login', login);

authRouter.post('/register', register);

authRouter.get('/validate-token',tokenAuth, validateToken);

export default authRouter;