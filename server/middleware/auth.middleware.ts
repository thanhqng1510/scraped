import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import prisma from '../lib/prisma';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: 'Authorization header is missing.' });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  try {
    let uid: string | undefined;

    if (scheme === 'Bearer' && token) {
      // Handle custom JWT for user sessions (no DB query)
      const decoded = jwt.verify(token, env.JWT_SECRET) as { uid: string };
      uid = decoded.uid;
    } else if (scheme === 'Api-Key' && token) {
      // Handle API Key (requires a DB query)
      const apiKey = await prisma.apiKey.findUnique({
        where: { 
          key: token 
        },
        select: { userId: true, expiresAt: true },
      });

      const isKeyValid = apiKey && (!apiKey.expiresAt || new Date(apiKey.expiresAt) > new Date());
      if (isKeyValid) {
        uid = apiKey.userId;
      }
    } else {
      res.status(401).json({ message: 'Unsupported or malformed authorization scheme.' });
      return
    }

    if (!uid) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    req.uid = uid;
    next();
  } catch (error) {
    // This will catch errors like an invalid JWT signature
    res.status(401).json({ message: 'Authentication failed: Invalid token.' });
    return;
  }
};
