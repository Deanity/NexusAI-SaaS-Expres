import { Router } from 'express';
import * as aiController from './ai.controller';
import { authenticate } from '@/shared/middleware/authenticate';
import { requireVerified } from '@/shared/middleware/requireVerified';
import { checkPlanLimit } from '@/shared/middleware/checkPlanLimit';
import { validate } from '@/shared/middleware/validate';
import { chatSchema } from './ai.schema';

const router = Router();

router.post(
  '/chat',
  authenticate,
  requireVerified,
  validate(chatSchema),
  checkPlanLimit,
  aiController.chat
);

export default router;
