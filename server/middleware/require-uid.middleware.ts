import { Request, Response, NextFunction } from 'express';

export const requireUidMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.uid) {
    res.status(401).send('Unauthorized: User not found.');
    return;
  }
  next();
};
