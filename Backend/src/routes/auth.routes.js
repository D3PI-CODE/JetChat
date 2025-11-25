import express, { response } from 'express';
import { login } from '../controllers/auth.controllers.js';

const router = express.Router();

router.get('/login', (req, res) => {
    res.json({
        name: "testing",
    });
});
router.post('/login', login);

router.post('/register', (req, res) => {
    console.log(req.body);
    res.send('Register route');
});

export default router;