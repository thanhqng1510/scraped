import { Router } from "express";
import { createApiKeyCtrl, getApiKeysCtrl, revokeApiKeyCtrl } from "../controllers/apikey.controller";

const router = Router();

router.get('/', getApiKeysCtrl);
router.post('/', createApiKeyCtrl);
router.patch('/:id/revoke', revokeApiKeyCtrl);

export default router;