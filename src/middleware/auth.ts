import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import prisma from '../lib/prisma';
import serviceAccount from '../../firebase-service-account.json';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: serviceAccount.project_id,
    privateKey: serviceAccount.private_key,
    clientEmail: serviceAccount.client_email
  }),
});

export const verifyFirebaseTokenAndUpsertUser = async (idToken: string) => {
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
  return user;
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).send('Unauthorized: No token provided');
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    req.user = await verifyFirebaseTokenAndUpsertUser(idToken);
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    res.status(403).send('Unauthorized: Invalid token');
    return;
  }
};

