import { z } from 'zod';

export const updateStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean({
      required_error: 'isActive is required',
    }),
  }),
});

export const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(['user', 'admin'], {
      required_error: 'role is required',
    }),
  }),
});

export const adjustCreditsSchema = z.object({
  body: z.object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
    amount: z.number().refine((val) => val !== 0, {
      message: 'Amount cannot be zero',
    }),
    description: z.string().min(1, 'Description is required').max(255),
  }),
});

export const createPlanSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(50),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be kebab-case'),
    price: z.number().min(0, 'Price must be greater than or equal to 0'),
    currency: z.enum(['USD', 'IDR']),
    billingCycle: z.enum(['monthly', 'yearly', 'lifetime']),
    creditsPerCycle: z.number().min(0, 'Credits must be greater than or equal to 0'),
    features: z.object({
      maxApiKeys: z.number().min(0),
      maxConversations: z.number(),
      maxMessagesPerDay: z.number(),
      allowedModels: z.array(z.string()).min(1, 'At least one model must be allowed'),
      priorityQueue: z.boolean(),
      analyticsRetentionDays: z.number().min(0),
    }),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updatePlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be kebab-case').optional(),
    price: z.number().min(0).optional(),
    currency: z.enum(['USD', 'IDR']).optional(),
    billingCycle: z.enum(['monthly', 'yearly', 'lifetime']).optional(),
    creditsPerCycle: z.number().min(0).optional(),
    features: z
      .object({
        maxApiKeys: z.number().min(0).optional(),
        maxConversations: z.number().optional(),
        maxMessagesPerDay: z.number().optional(),
        allowedModels: z.array(z.string()).min(1).optional(),
        priorityQueue: z.boolean().optional(),
        analyticsRetentionDays: z.number().min(0).optional(),
      })
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

export const userQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
  }),
});

export const adminAnalyticsQuerySchema = z.object({
  query: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});
