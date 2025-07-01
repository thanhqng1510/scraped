import { env } from './env';
import express from 'express';
import { authMiddleware } from './middleware/auth';
import jwt from 'jsonwebtoken';
import { verifyFirebaseTokenAndUpsertUser } from './lib/firebase';

const app = express();
const port = env.PORT;

app.set('view engine', 'ejs');
app.set('views', 'src/views');

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, Scraper!');
  // TODO: homepage, redirect to login page if not login
});

app.get('/login', (req, res) => {
  res.render('login');
  // TODO: redirect to homepage if logged in
});

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

// Protected route to test authentication
app.get('/api/v1/me', authMiddleware, (req, res) => {
  // If the request reaches here, the token is valid.
  // The user object is attached to the request by the middleware.
  res.json(req.user);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});