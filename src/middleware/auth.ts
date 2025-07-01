import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';

// You need to download this file from your Firebase project settings
// and place it in the root directory.
import serviceAccount from '../../firebase-service-account.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const prisma = new PrismaClient();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized: No token provided');
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // Find user in our DB or create one if they don't exist (upsert)
    const user = await prisma.user.upsert({
      where: { firebaseUid },
      update: {},
      create: {
        firebaseUid,
        email: decodedToken.email!,
      },
    });

    req.user = user;
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(403).send('Unauthorized: Invalid token');
  }
};

