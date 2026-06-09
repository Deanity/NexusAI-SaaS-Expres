import { Router } from 'express';
import * as subscriptionController from '@/modules/subscription/subscription.controller';
import { validate } from '@/shared/middleware/validate';
import { authenticate } from '@/shared/middleware/authenticate';
import { subscribeSchema } from '@/modules/subscription/subscription.schema';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Plans and user subscription management endpoints
 */

// Public routes

/**
 * @swagger
 * /api/v1/plans:
 *   get:
 *     summary: List all active plans
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Active plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Plans retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @swagger
 * /api/v1/plans/{slug}:
 *   get:
 *     summary: Get plan details by slug name
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           example: pro
 *     responses:
 *       200:
 *         description: Plan details retrieved successfully
 *       404:
 *         description: Plan not found
 */
router.get('/plans/:slug', subscriptionController.getPlanBySlug);

// Protected routes
router.use(authenticate);

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     summary: Subscribe to a plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 example: 60b7c7b2f63f5b2b3a4a5a6a
 *     responses:
 *       201:
 *         description: Subscribed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/subscriptions', validate(subscribeSchema), subscriptionController.subscribe);

/**
 * @swagger
 * /api/v1/subscriptions/current:
 *   get:
 *     summary: Retrieve currently active user subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active subscription found
 */
router.get('/subscriptions/current', subscriptionController.getCurrentSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/cancel:
 *   post:
 *     summary: Cancel subscription at period end
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully at period end
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active subscription found
 */
router.post('/subscriptions/cancel', subscriptionController.cancelSubscription);

export default router;
