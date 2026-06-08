import { Router } from 'express';
import * as conversationController from './conversation.controller';
import { authenticate } from '@/shared/middleware/authenticate';
import { validate } from '@/shared/middleware/validate';
import {
  createConversationSchema,
  updateConversationSchema,
  getConversationsQuerySchema,
  getMessagesQuerySchema,
} from './conversation.schema';

const router = Router();

// Apply authentication middleware to all routes in this module
router.use(authenticate);

router.post('/', validate(createConversationSchema), conversationController.createConversation);
router.get('/', validate(getConversationsQuerySchema), conversationController.getConversations);

router.get('/:id', conversationController.getConversationDetails);
router.patch('/:id', validate(updateConversationSchema), conversationController.updateConversation);
router.delete('/:id', conversationController.deleteConversation); // Soft delete

router.get(
  '/:id/messages',
  validate(getMessagesQuerySchema),
  conversationController.getConversationMessages
);
router.delete('/:id/messages', conversationController.clearConversationMessages);

export default router;
