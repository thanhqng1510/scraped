import { env } from './env';
import express, { json } from 'express';
import multer from 'multer';
import { authMiddleware } from './middleware/auth';
import { uploadKeywordsCtrl, getKeywordsCtrl, getKeywordDetailsCtrl } from './controllers/keyword.controller';
import { loginCtrl } from './controllers/auth.controller';

const app = express();
const port = env.PORT;

app.use(json());

app.post('/login', loginCtrl);

const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/v1/keywords/upload', authMiddleware, upload.single('keywords_file'), uploadKeywordsCtrl);

app.get('/api/v1/keywords', authMiddleware, getKeywordsCtrl);

app.get('/api/v1/keywords/:id', authMiddleware, getKeywordDetailsCtrl);

// Default 404
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});