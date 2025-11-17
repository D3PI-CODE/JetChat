import express from 'express';
import bcrypt from 'bcryptjs';
import { credentialsDB } from '../index.js';
import { User, UserModel } from '../models/user.model.js';

export const login = async (req, res) => {
    const { email, password } = req.body;
    console.log(`Email: ${email}, Password: ${password}`);
    res.json({
        message: 'Login successful',
    });
    try {
        const HashedPassword = await bcrypt.hash(password, 10);
        console.log(`Hashed Password: ${HashedPassword}`);
    } catch (error) {
        console.error('Error hashing password:', error);
    }
    const userModel = new UserModel(credentialsDB);
}

export const register = async (req, res) => {
    const { username, email, password } = req.body;
    console.log(`Username: ${username}, Email: ${email}, Password: ${password}`);
    res.json({
        message: 'Registration successful',
    });
    try {
        const HashedPassword = await bcrypt.hash(password, 10);
        console.log(`Hashed Password: ${HashedPassword}`);
    } catch (error) {
        console.error('Error hashing password:', error);
    }
    const userModel = new UserModel(credentialsDB);
}