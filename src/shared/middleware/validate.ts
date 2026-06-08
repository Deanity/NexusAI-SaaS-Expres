import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AnyZodObject } from 'zod';
import { asyncHandler } from '@/shared/utils/asyncHandler';

export const validate = (schema: AnyZodObject): RequestHandler =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  });
