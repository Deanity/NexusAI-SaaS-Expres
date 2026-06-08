import { Router } from 'express';
import * as userController from '@/modules/user/user.controller';
import { validate } from '@/shared/middleware/validate';
import { authenticate } from '@/shared/middleware/authenticate';
import { updateMeSchema } from '@/modules/user/user.schema';
import { changePasswordSchema } from '@/modules/auth/auth.schema';

const router = Router();

router.use(authenticate); // Secure all routes in this file

router.get('/me', userController.getMe);
router.patch('/me', validate(updateMeSchema), userController.updateMe);
router.patch('/me/password', validate(changePasswordSchema), userController.changePassword);

export default router;
