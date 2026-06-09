import { Router } from 'express';
import * as apiKeyController from './apiKey.controller';
import { authenticate } from '@/shared/middleware/authenticate';
import { validate } from '@/shared/middleware/validate';
import { createApiKeySchema, updateApiKeySchema } from './apiKey.schema';
import { createRateLimiter } from '@/shared/middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: API Keys
 *   description: Developer API key creation and management endpoints
 */

// Enforce authentication for all API key management routes
router.use(authenticate);

const apiKeyLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  keyPrefix: 'api_keys',
});
router.use(apiKeyLimiter);

/**
 * @swagger
 * /api/v1/api-keys:
 *   post:
 *     summary: Create a new developer API key
 *     tags: [API Keys]
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: A descriptive label for the API Key
 *                 example: Production API Key
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [chat:write, history:read, history:delete, analytics:read, credits:read]
 *                 example: ["chat:write", "history:read"]
 *               ipWhitelist:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["192.168.1.1"]
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-12-31T23:59:59Z
 *     responses:
 *       201:
 *         description: API Key created successfully. Returns the full plain text key ONCE.
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', validate(createApiKeySchema), apiKeyController.createKey);

/**
 * @swagger
 * /api/v1/api-keys:
 *   get:
 *     summary: List all API keys for the current user
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API keys retrieved successfully. Shows prefixes only, never hashes or full keys.
 *       401:
 *         description: Unauthorized
 */
router.get('/', apiKeyController.listKeys);

/**
 * @swagger
 * /api/v1/api-keys/{id}:
 *   patch:
 *     summary: Update API key settings (name, scopes, ipWhitelist, expiresAt)
 *     tags: [API Keys]
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
 *             properties:
 *               name:
 *                 type: string
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *               ipWhitelist:
 *                 type: array
 *                 items:
 *                   type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: API Key updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: API Key not found
 */
router.patch('/:id', validate(updateApiKeySchema), apiKeyController.updateKey);

/**
 * @swagger
 * /api/v1/api-keys/{id}:
 *   delete:
 *     summary: Revoke (soft-delete) an API key
 *     tags: [API Keys]
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
 *         description: API Key revoked successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: API Key not found
 */
router.delete('/:id', apiKeyController.revokeKey);

/**
 * @swagger
 * /api/v1/api-keys/{id}/rotate:
 *   post:
 *     summary: Rotate API key (generate new plain text key value with same settings)
 *     tags: [API Keys]
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
 *         description: API Key rotated successfully. Returns the new plain text key value ONCE.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: API Key not found
 */
router.post('/:id/rotate', apiKeyController.rotateKey);

export default router;
