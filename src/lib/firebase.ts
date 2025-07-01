import admin from 'firebase-admin';
import serviceAccount from '../../firebase-service-account.json';
import prisma from '../lib/prisma';

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