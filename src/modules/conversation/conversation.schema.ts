import { z } from 'zod';

export const createConversationSchema = z.object({
  body: z.object({
    model: z.string().default('gemini-1.5-flash'),
    title: z.string().max(100).optional(),
    systemPrompt: z.string().optional(),
  }),
});

export const updateConversationSchema = z.object({
  body: z.object({
    title: z.string().max(100).optional(),
    systemPrompt: z.string().nullable().optional(),
    isPinned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  }),
});

export const getConversationsQuerySchema = z.object({
  query: z.object({
    page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1).default(1)),
    limit: z.preprocess(
      (val) => (val ? Number(val) : 20),
      z.number().int().min(1).max(100).default(20)
    ),
    archived: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  }),
});

export const getMessagesQuerySchema = z.object({
  query: z.object({
    page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1).default(1)),
    limit: z.preprocess(
      (val) => (val ? Number(val) : 50),
      z.number().int().min(1).max(100).default(50)
    ),
  }),
});
