import { Router } from 'express';
import multer from 'multer';
import {
  uploadKeywordsCtrl,
  getKeywordsCtrl,
  getKeywordDetailsCtrl,
} from '../controllers/keywords.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('keywords_file'), uploadKeywordsCtrl);
router.get('/', getKeywordsCtrl);
router.get('/:id', getKeywordDetailsCtrl);

export default router;