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

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative endpoints for user management, credit adjustment, plans CRUD, and platform statistics
 */

// Apply admin protection to all routes in this router
router.use(authenticate);
router.use(authorize(['admin']));

const adminLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 500,
  keyPrefix: 'admin',
});
router.use(adminLimiter);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List all users (paginated with search)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query matching name or email
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sorting criteria (e.g. -createdAt)
 *     responses:
 *       200:
 *         description: Users list retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 */
router.get('/users', validate(userQuerySchema), adminController.getUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get user details by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/users/:id', adminController.getUserById);

/**
 * @swagger
 * /api/v1/admin/users/{id}/status:
 *   patch:
 *     summary: Ban or unban a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Set to false to ban, true to unban
 *     responses:
 *       200:
 *         description: User status updated successfully. Banning also revokes all active sessions.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/status', validate(updateStatusSchema), adminController.updateUserStatus);

/**
 * @swagger
 * /api/v1/admin/users/{id}/role:
 *   patch:
 *     summary: Change user role (user or admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/role', validate(updateRoleSchema), adminController.updateUserRole);

/**
 * @swagger
 * /api/v1/admin/credits/adjust:
 *   post:
 *     summary: Manually add or deduct user credits
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *               - description
 *             properties:
 *               userId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 description: Positive to add credits, negative to deduct credits.
 *                 example: 500
 *               description:
 *                 type: string
 *                 description: Reason for adjustment
 *                 example: Manual top-up by admin
 *     responses:
 *       200:
 *         description: Credits adjusted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post('/credits/adjust', validate(adjustCreditsSchema), adminController.adjustCredits);

/**
 * @swagger
 * /api/v1/admin/plans:
 *   post:
 *     summary: Create a subscription plan
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *               - price
 *               - currency
 *               - billingCycle
 *               - creditsPerCycle
 *             properties:
 *               name:
 *                 type: string
 *                 example: Premium Pro
 *               slug:
 *                 type: string
 *                 example: premium-pro
 *               price:
 *                 type: number
 *                 description: Cost in cents (or base currency unit)
 *                 example: 2900
 *               currency:
 *                 type: string
 *                 example: USD
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly, lifetime]
 *                 example: monthly
 *               creditsPerCycle:
 *                 type: number
 *                 example: 50000
 *     responses:
 *       201:
 *         description: Plan created successfully
 *       409:
 *         description: Plan slug already exists
 */
router.post('/plans', validate(createPlanSchema), adminController.createPlan);

/**
 * @swagger
 * /api/v1/admin/plans/{id}:
 *   patch:
 *     summary: Update an existing subscription plan
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *       404:
 *         description: Plan not found
 */
router.patch('/plans/:id', validate(updatePlanSchema), adminController.updatePlan);

/**
 * @swagger
 * /api/v1/admin/plans/{id}:
 *   delete:
 *     summary: Soft-delete (deactivate) a subscription plan
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plan soft-deleted successfully
 *       404:
 *         description: Plan not found
 */
router.delete('/plans/:id', adminController.deletePlan);

/**
 * @swagger
 * /api/v1/admin/analytics/overview:
 *   get:
 *     summary: Get platform-wide aggregated totals within date range
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Admin platform overview analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/analytics/overview',
  validate(adminAnalyticsQuerySchema),
  adminController.getOverviewAnalytics
);

/**
 * @swagger
 * /api/v1/admin/analytics/users:
 *   get:
 *     summary: Get usage breakdown ranking of all users (paginated)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Admin users usage breakdown retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/analytics/users',
  validate(adminAnalyticsQuerySchema),
  adminController.getUsersAnalytics
);

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
