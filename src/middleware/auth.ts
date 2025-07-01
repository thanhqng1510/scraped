import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { env } from '../env';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).send('Unauthorized: No token provided');
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { uid: string; email: string };
    const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });

    if (!user) {
      res.status(404).send('User not found');
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error verifying JWT:', error);
    res.status(403).send('Unauthorized: Invalid token');
    return;
  }
};

