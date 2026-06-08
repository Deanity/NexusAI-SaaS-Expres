import { Router } from 'express';
import * as analyticsController from './analytics.controller';
import { authenticate } from '@/shared/middleware/authenticate';
import { requireScope } from '@/shared/middleware/requireScope';
import { ApiKeyScope } from '@/modules/apikey/apiKey.model';
import { validate } from '@/shared/middleware/validate';
import { analyticsQuerySchema } from './analytics.schema';

const router = Router();

// Apply authentication, analytics:read scope check, and query validation to all analytics endpoints
router.use(authenticate);
router.use(requireScope(ApiKeyScope.ANALYTICS_READ));
router.use(validate(analyticsQuerySchema));

router.get('/overview', analyticsController.getOverview);
router.get('/daily', analyticsController.getDaily);
router.get('/models', analyticsController.getModels);
router.get('/api-keys', analyticsController.getApiKeys);

export default router;
