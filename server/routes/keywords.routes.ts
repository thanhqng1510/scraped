import { Router } from 'express';
import multer from 'multer';
import {
  uploadKeywordsCtrl,
  getKeywordsCtrl,
  getKeywordDetailsCtrl,
} from '../controllers/keywords.controller';
import { requireUidMiddleware } from '../middleware/require-uid.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', requireUidMiddleware, upload.single('keywords_file'), uploadKeywordsCtrl);
router.get('/', requireUidMiddleware, getKeywordsCtrl);
router.get('/:id', requireUidMiddleware, getKeywordDetailsCtrl);

export default router;