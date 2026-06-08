import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  query: z.object({
    from: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) {
          // Default: 30 days ago at 00:00:00.000 UTC
          const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        }
        const date = new Date(val);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      })
      .refine((date) => !isNaN(date.getTime()), { message: 'Invalid start date format' }),
    to: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) {
          // Default: today at 23:59:59.999 UTC
          const date = new Date();
          date.setUTCHours(23, 59, 59, 999);
          return date;
        }
        const date = new Date(val);
        date.setUTCHours(23, 59, 59, 999);
        return date;
      })
      .refine((date) => !isNaN(date.getTime()), { message: 'Invalid end date format' }),
  }),
});
