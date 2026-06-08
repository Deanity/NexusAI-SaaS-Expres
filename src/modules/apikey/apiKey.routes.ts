import { Router } from 'express';
import * as apiKeyController from './apiKey.controller';
import { authenticate } from '@/shared/middleware/authenticate';
import { validate } from '@/shared/middleware/validate';
import { createApiKeySchema, updateApiKeySchema } from './apiKey.schema';

const router = Router();

// Enforce authentication for all API key management routes
router.use(authenticate);

router.post('/', validate(createApiKeySchema), apiKeyController.createKey);
router.get('/', apiKeyController.listKeys);
router.patch('/:id', validate(updateApiKeySchema), apiKeyController.updateKey);
router.delete('/:id', apiKeyController.revokeKey);
router.post('/:id/rotate', apiKeyController.rotateKey);

export default router;
