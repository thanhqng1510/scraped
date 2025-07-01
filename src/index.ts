import { env } from './env';
import express from 'express';
import { authMiddleware } from './middleware/auth';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, Scraper!');
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