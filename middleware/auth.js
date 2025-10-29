import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({path: '../.env'});
import prisma from '../db/db.js';
import { AppError } from '../utils/Apperror.js';


export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(new AppError(401, 'Access token required'));
    }
    console.log('token is getting from user',token)
    console.log('jwt secret is ',process.env.JWT_SECRET)
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('I am getting error',err)
            return next(new AppError(403, 'Invalid token'));
        }
        req.user = user;
        next();
    });
};


export const authorizeCompanyAccess = async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const userId = req.user.id;


        const userRole = req.user.role.trim()
        if(userRole !== 'admin') {
            return next(new AppError(403, 'Access denied - You do not have access to this company'));
        }
        next();
    } catch (error) {
        next(error);
    }
};
