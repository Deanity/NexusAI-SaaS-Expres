import { Router } from 'express';
import * as adminController from './admin.controller';
import { authenticate } from '@/shared/middleware/authenticate';
import { authorize } from '@/shared/middleware/authorize';
import { validate } from '@/shared/middleware/validate';
import { createRateLimiter } from '@/shared/middleware/rateLimiter';
import {
  updateStatusSchema,
  updateRoleSchema,
  adjustCreditsSchema,
  createPlanSchema,
  updatePlanSchema,
  userQuerySchema,
  adminAnalyticsQuerySchema,
} from './admin.schema';

const router = Router();

// Apply admin protection to all routes in this router
router.use(authenticate);
router.use(authorize(['admin']));

const adminLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 500,
  keyPrefix: 'admin',
});
router.use(adminLimiter);

// Users management
router.get('/users', validate(userQuerySchema), adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/status', validate(updateStatusSchema), adminController.updateUserStatus);
router.patch('/users/:id/role', validate(updateRoleSchema), adminController.updateUserRole);

// Credit adjustment
router.post('/credits/adjust', validate(adjustCreditsSchema), adminController.adjustCredits);

// Plans management
router.post('/plans', validate(createPlanSchema), adminController.createPlan);
router.patch('/plans/:id', validate(updatePlanSchema), adminController.updatePlan);
router.delete('/plans/:id', adminController.deletePlan);

// Analytics
router.get(
  '/analytics/overview',
  validate(adminAnalyticsQuerySchema),
  adminController.getOverviewAnalytics
);
router.get(
  '/analytics/users',
  validate(adminAnalyticsQuerySchema),
  adminController.getUsersAnalytics
);

export default router;
