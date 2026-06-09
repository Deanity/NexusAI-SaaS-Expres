import { Router } from 'express';
import * as conversationController from './conversation.controller';
import { authenticate } from '@/shared/middleware/authenticate';
import { validate } from '@/shared/middleware/validate';
import { requireScope } from '@/shared/middleware/requireScope';
import { ApiKeyScope } from '@/modules/apikey/apiKey.model';
import {
  createConversationSchema,
  updateConversationSchema,
  getConversationsQuerySchema,
  getMessagesQuerySchema,
} from './conversation.schema';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Conversations
 *   description: Conversation history management endpoints
 */

// Apply authentication middleware to all routes in this module
router.use(authenticate);

/**
 * @swagger
 * /api/v1/conversations:
 *   post:
 *     summary: Create a new empty conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model
 *               - title
 *             properties:
 *               model:
 *                 type: string
 *                 example: gemini-1.5-flash
 *               title:
 *                 type: string
 *                 example: New chat topic
 *               systemPrompt:
 *                 type: string
 *                 example: You are a helpful assistant.
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  requireScope(ApiKeyScope.HISTORY_READ),
  validate(createConversationSchema),
  conversationController.createConversation
);

/**
 * @swagger
 * /api/v1/conversations:
 *   get:
 *     summary: List user's conversations (paginated)
 *     tags: [Conversations]
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
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to include archived conversations
 *     responses:
 *       200:
 *         description: List of conversations retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  requireScope(ApiKeyScope.HISTORY_READ),
  validate(getConversationsQuerySchema),
  conversationController.getConversations
);

/**
 * @swagger
 * /api/v1/conversations/{id}:
 *   get:
 *     summary: Get details of a single conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/:id',
  requireScope(ApiKeyScope.HISTORY_READ),
  conversationController.getConversationDetails
);

/**
 * @swagger
 * /api/v1/conversations/{id}:
 *   patch:
 *     summary: Update conversation details (title, systemPrompt, isPinned)
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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
 *               title:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *               isPinned:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Conversation updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.patch(
  '/:id',
  requireScope(ApiKeyScope.HISTORY_READ),
  validate(updateConversationSchema),
  conversationController.updateConversation
);

/**
 * @swagger
 * /api/v1/conversations/{id}:
 *   delete:
 *     summary: Archive (soft-delete) a conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation archived successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.delete(
  '/:id',
  requireScope(ApiKeyScope.HISTORY_DELETE),
  conversationController.deleteConversation
); // Soft delete

/**
 * @swagger
 * /api/v1/conversations/{id}/messages:
 *   get:
 *     summary: Get paginated messages of a conversation (oldest first)
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/:id/messages',
  requireScope(ApiKeyScope.HISTORY_READ),
  validate(getMessagesQuerySchema),
  conversationController.getConversationMessages
);

/**
 * @swagger
 * /api/v1/conversations/{id}/messages:
 *   delete:
 *     summary: Clear all messages from a conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation messages cleared successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.delete(
  '/:id/messages',
  requireScope(ApiKeyScope.HISTORY_DELETE),
  conversationController.clearConversationMessages
);

export default router;
