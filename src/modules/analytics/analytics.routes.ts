import { Router } from 'express';
import * as analyticsController from './analytics.controller';
import { authenticate } from '@/shared/middleware/authenticate';
import { requireScope } from '@/shared/middleware/requireScope';
import { ApiKeyScope } from '@/modules/apikey/apiKey.model';
import { validate } from '@/shared/middleware/validate';
import { analyticsQuerySchema } from './analytics.schema';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: User analytics and usage breakdown endpoints
 */

// Apply authentication, analytics:read scope check, and query validation to all analytics endpoints
router.use(authenticate);
router.use(requireScope(ApiKeyScope.ANALYTICS_READ));
router.use(validate(analyticsQuerySchema));

/**
 * @swagger
 * /api/v1/analytics/overview:
 *   get:
 *     summary: Retrieve total credits used, messages, and tokens within date range
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD). Defaults to 30 days ago.
 *         example: 2026-05-01
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD). Defaults to today.
 *         example: 2026-05-31
 *     responses:
 *       200:
 *         description: Overview analytics retrieved successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalMessages:
 *                       type: number
 *                     totalTokensUsed:
 *                       type: number
 *                     totalCreditsUsed:
 *                       type: number
 *                     averageLatencyMs:
 *                       type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/overview', analyticsController.getOverview);

/**
 * @swagger
 * /api/v1/analytics/daily:
 *   get:
 *     summary: Get daily usage breakdown grouped by date
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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
 *         description: Daily usage breakdown retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/daily', analyticsController.getDaily);

/**
 * @swagger
 * /api/v1/analytics/models:
 *   get:
 *     summary: Get usage breakdown by AI model
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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
 *         description: Model usage breakdown retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/models', analyticsController.getModels);

/**
 * @swagger
 * /api/v1/analytics/api-keys:
 *   get:
 *     summary: Get usage breakdown per developer API Key
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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
 *         description: API Key usage breakdown retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/api-keys', analyticsController.getApiKeys);

export default router;
