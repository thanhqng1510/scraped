import { Router } from 'express';
import { loginCtrl } from '../controllers/auth.controller';

const router = Router();

router.post('/', loginCtrl);

export default router;