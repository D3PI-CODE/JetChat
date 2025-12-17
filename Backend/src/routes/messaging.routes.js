import express from 'express';
import { tokenAuth } from '../middleware/tokenAuth.js';
import {
    deleteGroup, 
    getMessages, 
    createGroup,
    renameGroup,
    addGroupMember,
    changeGroupMemberRole,
    leaveGroup,
    removeGroupMember
} from '../controllers/message.controllers.js';

const msgRouter = express.Router();

msgRouter.get('/get-messages', tokenAuth, getMessages);

msgRouter.patch('/change-Profile', tokenAuth, (req, res) => {
    res.json({ message: 'Change profile endpoint' });
});

msgRouter.post('/create-Group', tokenAuth, createGroup);

msgRouter.delete('/delete-Group', tokenAuth, deleteGroup);

msgRouter.patch('/rename-Group', tokenAuth, renameGroup);

msgRouter.post('/add-Group-Member', tokenAuth, addGroupMember);

msgRouter.delete('/remove-Group-Member', tokenAuth, removeGroupMember);

msgRouter.patch('/change-Group-Member-Role', tokenAuth, changeGroupMemberRole);

msgRouter.patch('/change-Group-Avatar', tokenAuth, (req, res) => {
    res.json({ message: 'Change group avatar endpoint' });
});

msgRouter.delete('/leave-group', tokenAuth, leaveGroup);

export default msgRouter;