import admin from 'firebase-admin';
import serviceAccount from '../firebase-service-account.json';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: serviceAccount.project_id,
    privateKey: serviceAccount.private_key,
    clientEmail: serviceAccount.client_email
  }),
});

export const verifyFirebaseToken = async (idToken: string) => {
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return decodedToken;
};
