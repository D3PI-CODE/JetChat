import express from 'express';
import bcrypt from 'bcryptjs';
import { credentialsDB, messagingDB } from '../index.js';
import { UserAuth, UserAuthModel } from '../models/userAuth.model.js';
import { User, UserModel } from '../models/user.model.js';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
    const { email, password } = req.body;
    console.log(`Email: ${email}, Password: ${password}`);
    const userAuthModel = new UserAuthModel(credentialsDB);
    const userModel = new UserModel(messagingDB);
    const userId = await userAuthModel.emailSearch(email);
    if (!userId) {
        res.json({
            validCredentials: false,
        });
    }
    
    const userPass = await userAuthModel.getPassword(userId);
    const isPassValid = await bcrypt.compare(password, userPass);
    const JWT_SECRET = process.env.JWT_SECRET;
    const msgUserId = await userModel.emailSearch(email);
    if (isPassValid) {

        const user = {
            id: msgUserId,
            email: email,
        }
        const token = jwt.sign(user, JWT_SECRET);
        res.json({
            validCredentials: true,
            token: token,
        });
    } else {
        res.json({
            validCredentials: false,
        });
    }


}

export const register = async (req, res) => {
    const { username, email, password } = req.body;
    console.log(`Username: ${username}, Email: ${email}, Password: ${password}`);
    res.json({
        message: 'Registration successful',
    });
    let HashedPassword;
    try {
        HashedPassword = await bcrypt.hash(password, 10);
    } catch (error) {
        console.error('Error hashing password:', error);
    }
    const userAuthModel = new UserAuthModel(credentialsDB);
    const userModel = new UserModel(messagingDB);
    const userId = await userAuthModel.emailSearch(email);
    if (!userId) {
        userAuthModel.createUser(email, HashedPassword);
        userModel.createUser(email, username);
    }
}

export const validateToken = async (req, res) => {
    const userModel = new UserModel(messagingDB);
    const email = req.user.email;
    console.log(`Validating token for email: ${email}`);
    const userId = await userModel.emailSearch(email);
    if (userId === req.user.id) {
        res.json(
        {
            id: userId,
            email: email,
            valid: true,
        });
    } else {
        res.json(
        {
            valid: false,
        })

    }
}