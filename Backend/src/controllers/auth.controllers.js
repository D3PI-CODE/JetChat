import express from 'express';
import bcrypt from 'bcryptjs';
import { credentialsDB, messagingDB } from '../index.js';
import { UserAuth, UserAuthModel } from '../models/userAuth.model.js';
import { User, UserModel } from '../models/user.model.js';

export const login = async (req, res) => {
    const { email, password } = req.body;
    console.log(`Email: ${email}, Password: ${password}`);
    const userAuthModel = new UserAuthModel(credentialsDB);
    const userId = await userAuthModel.emailSearch(email);
    const userPass = await userAuthModel.getPassword(userId);
    const isPassValid = await bcrypt.compare(password, userPass);
    if (isPassValid) {
        res.json({
            validCredentials: true,
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
        console.log(`Hashed Password: ${HashedPassword}`);
    } catch (error) {
        console.error('Error hashing password:', error);
    }
    const userAuthModel = new UserAuthModel(credentialsDB);
    const userModel = new UserModel(messagingDB);
    const userId = await userAuthModel.emailSearch(email);
    if (!userId) {
        userAuthModel.createUser(email, HashedPassword);
    }
}