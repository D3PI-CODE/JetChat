import express, { response } from 'express';
import { login, register, validateToken } from '../controllers/auth.controllers.js';
import { tokenAuth } from '../middleware/tokenAuth.js';

const router = express.Router();

router.post('/login', login);

router.post('/register', register);

router.get('/validate-token',tokenAuth, validateToken);

export default router;