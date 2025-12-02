import express from 'express';
import bcrypt from 'bcryptjs';
import { credentialsDB, messagingDB } from '../index.js';
import { UserAuth, UserAuthModel } from '../models/userAuth.model.js';
import { User, UserModel } from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import redisClient from '../lib/RedisInit.js';

export const login = async (req, res) => {
    const { email, password } = req.body;
    console.log(`Email: ${email}, Password: ${password}`);
    if (!email || !password) {
        console.error('Missing email or password in login request', { email, password });
        return res.status(400).json({ validCredentials: false, error: 'Missing email or password' });
    }
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
    redisClient.hGet(`${email}`,async (err, id) => {
        if (err) {
            console.error('Redis hGet error:', err);
        } else if (id != null) {
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

        } else {
            const msgUserId = await userModel.emailSearch(email);
            redisClient.hSet(`${email}`, 'id', `${msgUserId}`, (err) => {
                if (err) {
                    console.error('Redis hSet error:', err);
                } else {
                    console.log(`Stored login session for user ${email} with id: ${userId}`);
                }
            });
        }
    })


}

export const register = async (req, res) => {
    const { username, email, password } = req.body;
    console.log(`Username: ${username}, Email: ${email}, Password: ${password}`);
    if (!username || !email || !password) {
        console.error('Missing registration fields', { username, email, password });
        return res.status(400).json({ message: 'Missing registration fields' });
    }
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
    const email = req.user && req.user.email;
    console.log(`Validating token for email: ${email}`);
    if (!email) {
        console.error('validateToken: no email found on req.user', { user: req.user });
        return res.status(400).json({ valid: false, error: 'No email in token' });
    }
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