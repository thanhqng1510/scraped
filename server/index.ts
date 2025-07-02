import { env } from './env';
import express, { json } from 'express';
import jwt from 'jsonwebtoken';
import { verifyFirebaseTokenAndUpsertUser } from './lib/firebase';

const app = express();
const port = env.PORT;

app.use(json())

app.post('/login', async (req, res) => {
  const idToken = req.body.idToken;

  if (!idToken) {
    res.status(400).send('Bad Request: No ID token provided.');
    return;
  }

  try {
    const user = await verifyFirebaseTokenAndUpsertUser(idToken);
    const token = jwt.sign({ uid: user.firebaseUid, email: user.email }, env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Authentication successful', token });
  } catch (error) {
    console.error('Error in POST /login:', error);
    res.status(403).send('Unauthorized: Invalid token or authentication failed.');
  }
});

// Default 404
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});