import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';

// Middleware to authenticate SSE connections using token from query parameter
export const authSSEMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.query.token as string;

  if (!token) {
    res.status(401).send('Unauthorized: No token provided.');
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { uid: string };
    req.uid = decoded.uid;
    next();
  } catch (error) {
    console.error('SSE authentication failed:', error);
    res.status(403).send('Unauthorized: Invalid token.');
  }
};
