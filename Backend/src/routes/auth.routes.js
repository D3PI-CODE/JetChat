import express, { response } from 'express';
import { login, register } from '../controllers/auth.controllers.js';

const router = express.Router();

router.get('/login', (req, res) => {
    res.json({
        name: "testing",
    });
});
router.post('/login', login);

router.post('/register', register);

export default router;