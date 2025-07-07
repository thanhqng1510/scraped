import { env } from './env';
import express, { json, urlencoded } from 'express';
import { initNotiEventWorker } from './controllers/events.controller';
import authRoutes from './routes/auth.routes';
import keywordsRoutes from './routes/keywords.routes';
import eventsRoutes from './routes/events.routes';
import apikeysRoutes from './routes/apikey.routes';
import { authMiddleware } from './middleware/auth.middleware';
import { authSSEMiddleware } from './middleware/authSSE.middleware';

const app = express();
const port = env.PORT;

app.use(urlencoded({ extended: true }));
app.use(json());

// API Routes
app.use('/login', authRoutes);
app.use('/api/v1/keywords', authMiddleware, keywordsRoutes);
app.use('/api/v1/events', authSSEMiddleware, eventsRoutes);
app.use('/api/v1/apikeys', authMiddleware, apikeysRoutes);

initNotiEventWorker()

// Default 404
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
