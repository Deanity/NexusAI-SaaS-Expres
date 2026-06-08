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

// Apply authentication middleware to all routes in this module
router.use(authenticate);

router.post(
  '/',
  requireScope(ApiKeyScope.HISTORY_READ),
  validate(createConversationSchema),
  conversationController.createConversation
);

router.get(
  '/',
  requireScope(ApiKeyScope.HISTORY_READ),
  validate(getConversationsQuerySchema),
  conversationController.getConversations
);

router.get(
  '/:id',
  requireScope(ApiKeyScope.HISTORY_READ),
  conversationController.getConversationDetails
);

router.patch(
  '/:id',
  requireScope(ApiKeyScope.HISTORY_READ),
  validate(updateConversationSchema),
  conversationController.updateConversation
);

router.delete(
  '/:id',
  requireScope(ApiKeyScope.HISTORY_DELETE),
  conversationController.deleteConversation
); // Soft delete

router.get(
  '/:id/messages',
  requireScope(ApiKeyScope.HISTORY_READ),
  validate(getMessagesQuerySchema),
  conversationController.getConversationMessages
);

router.delete(
  '/:id/messages',
  requireScope(ApiKeyScope.HISTORY_DELETE),
  conversationController.clearConversationMessages
);

export default router;
