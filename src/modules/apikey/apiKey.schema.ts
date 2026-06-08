import { z } from 'zod';
import { ApiKeyScope } from './apiKey.model';

export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    scopes: z.array(z.nativeEnum(ApiKeyScope)).min(1, 'At least one scope is required'),
    ipWhitelist: z.array(z.string()).optional().default([]),
    expiresAt: z
      .string()
      .datetime({ precision: 3 })
      .nullable()
      .optional()
      .transform((val) => (val ? new Date(val) : null)),
  }),
});

export const updateApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    scopes: z.array(z.nativeEnum(ApiKeyScope)).min(1).optional(),
    ipWhitelist: z.array(z.string()).optional(),
    expiresAt: z
      .string()
      .datetime({ precision: 3 })
      .nullable()
      .optional()
      .transform((val) => (val === null ? null : val ? new Date(val) : undefined)),
  }),
});
