import { Router } from 'express';
import { subscribeEventCtrl } from '../controllers/events.controller';

const router = Router();

router.get('/', subscribeEventCtrl);

export default router;