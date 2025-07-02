import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyFirebaseToken } from '../lib/firebase';
import { env } from '../env';
import prisma from '../lib/prisma';

export const loginCtrl = async (req: Request, res: Response) => {
  const idToken = req.body.idToken;

  if (!idToken) {
    res.status(400).send('Bad Request: No ID token provided.');
    return;
  }

  try {
    const decodedToken = await verifyFirebaseToken(idToken);
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

    const token = jwt.sign({ uid: user.firebaseUid, email: user.email }, env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Authentication successful', token });
  } catch (error) {
    console.error('Error in POST /login:', error);
    res.status(403).send('Unauthorized: Invalid token or authentication failed.');
  }
};