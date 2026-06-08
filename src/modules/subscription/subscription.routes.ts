import { Router } from 'express';
import * as subscriptionController from '@/modules/subscription/subscription.controller';
import { validate } from '@/shared/middleware/validate';
import { authenticate } from '@/shared/middleware/authenticate';
import { subscribeSchema } from '@/modules/subscription/subscription.schema';

const router = Router();

// Public routes
router.get('/plans', subscriptionController.getPlans);
router.get('/plans/:slug', subscriptionController.getPlanBySlug);

// Protected routes
router.use(authenticate);

router.post('/subscriptions', validate(subscribeSchema), subscriptionController.subscribe);
router.get('/subscriptions/current', subscriptionController.getCurrentSubscription);
router.post('/subscriptions/cancel', subscriptionController.cancelSubscription);

export default router;
