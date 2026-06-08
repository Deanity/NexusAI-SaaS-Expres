import { z } from 'zod';

export const chatSchema = z.object({
  body: z.object({
    conversationId: z.string().optional(),
    model: z.string().min(1, 'Model is required'),
    message: z.string().min(1, 'Message is required'),
    systemPrompt: z.string().optional(),
    stream: z.boolean().default(false),
  }),
});
