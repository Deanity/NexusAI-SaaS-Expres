import { Router } from 'express';
import * as creditController from '@/modules/credit/credit.controller';
import { authenticate } from '@/shared/middleware/authenticate';
import { requireScope } from '@/shared/middleware/requireScope';
import { ApiKeyScope } from '@/modules/apikey/apiKey.model';

const router = Router();

router.use(authenticate); // Secure all credit routes

router.get('/balance', requireScope(ApiKeyScope.CREDITS_READ), creditController.getBalance);
router.get('/history', requireScope(ApiKeyScope.CREDITS_READ), creditController.getHistory);

export default router;
