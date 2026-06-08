import { Router } from 'express';
import * as creditController from '@/modules/credit/credit.controller';
import { authenticate } from '@/shared/middleware/authenticate';

const router = Router();

router.use(authenticate); // Secure all credit routes

router.get('/balance', creditController.getBalance);
router.get('/history', creditController.getHistory);

export default router;
