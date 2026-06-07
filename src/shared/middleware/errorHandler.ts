import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '@/shared/errors/AppError';
import { sendError } from '@/shared/utils/response';
import { env } from '@/config/env';

export const errorHandler: ErrorRequestHandler = (
  err: Error & { statusCode?: number; code?: string; details?: unknown },
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.code || 'INTERNAL_ERROR';
  let details: unknown = err.details || null;

  // Log unexpected errors
  if (statusCode === 500) {
    console.error('❌ Unexpected Error:', err);
  }

  // Handle AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.code || 'APP_ERROR';
    details = err.details || null;
  }

  // Handle Zod Validation Error
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errorCode = 'VALIDATION_ERROR';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // Handle Mongoose Validation Error
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation Error';
    errorCode = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle Mongoose Cast Error (e.g. invalid ObjectId)
  else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for path ${err.path}`;
    errorCode = 'VALIDATION_ERROR';
  }

  // Handle Mongoose duplicate key error (code 11000)
  else if ((err as mongoose.mongo.MongoServerError).code === 11000) {
    statusCode = 409;
    const keyVal = (err as mongoose.mongo.MongoServerError).keyValue || {};
    const field = Object.keys(keyVal)[0];
    message = `${field || 'Field'} already exists`;
    errorCode = field === 'email' ? 'DUPLICATE_EMAIL' : 'DUPLICATE_KEY_NAME';
  }

  // Include stack trace in development
  const errorDetails =
    env.NODE_ENV === 'development'
      ? {
          details,
          stack: err.stack,
        }
      : details;

  sendError(res, statusCode, message, errorCode, errorDetails);
};
