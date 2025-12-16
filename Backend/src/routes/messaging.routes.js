import express from 'express';
import { tokenAuth } from '../middleware/tokenAuth.js';
import { getMessages } from '../controllers/message.controllers.js';
import { createGroup } from '../controllers/message.controllers.js';

const msgRouter = express.Router();

msgRouter.get('/get-messages', tokenAuth, getMessages);

msgRouter.patch('/change-Profile', tokenAuth, (req, res) => {
    res.json({ message: 'Change profile endpoint' });
});

msgRouter.post('/create-Group', tokenAuth, createGroup);

msgRouter.delete('/delete-Group', tokenAuth, (req, res) => {
    res.json({ message: 'Delete group endpoint' });
});

msgRouter.patch('/rename-Group', tokenAuth, (req, res) => {
    res.json({ message: 'Rename group endpoint' });
});

msgRouter.post('/add-Group-Member', tokenAuth, (req, res) => {
    res.json({ message: 'Add group member endpoint' });
});

msgRouter.delete('/remove-Group-Member', tokenAuth, (req, res) => {
    res.json({ message: 'Remove group member endpoint' });
});

msgRouter.patch('/change-Group-Member-Role', tokenAuth, (req, res) => {
    res.json({ message: 'Change group member role endpoint' });
});

msgRouter.patch('/change-Group-Avatar', tokenAuth, (req, res) => {
    res.json({ message: 'Change group avatar endpoint' });
});

msgRouter.delete('/leave-group', tokenAuth, (req, res) => {
    res.json({ message: 'Leave group endpoint' });
});

export default msgRouter;