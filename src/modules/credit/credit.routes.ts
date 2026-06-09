import { Router } from 'express';
import * as creditController from '@/modules/credit/credit.controller';
import { authenticate } from '@/shared/middleware/authenticate';
import { requireScope } from '@/shared/middleware/requireScope';
import { ApiKeyScope } from '@/modules/apikey/apiKey.model';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Credits
 *   description: Credit balance and transaction ledger endpoints
 */

router.use(authenticate); // Secure all credit routes

/**
 * @swagger
 * /api/v1/credits/balance:
 *   get:
 *     summary: Retrieve user's current credit balance
 *     tags: [Credits]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Credit balance retrieved successfully
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
 *                   example: Credit balance retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: number
 *                       example: 100
 *       401:
 *         description: Unauthorized
 */
router.get('/balance', requireScope(ApiKeyScope.CREDITS_READ), creditController.getBalance);

/**
 * @swagger
 * /api/v1/credits/history:
 *   get:
 *     summary: Get user's paginated credit ledger history
 *     tags: [Credits]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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
 *     responses:
 *       200:
 *         description: Credit ledger history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/history', requireScope(ApiKeyScope.CREDITS_READ), creditController.getHistory);

export default router;
