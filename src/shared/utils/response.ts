import { Response } from 'express';

interface MetaData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T | null;
  meta?: MetaData | null;
}

interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: unknown;
  data: null;
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T | null = null,
  meta: MetaData | null = null
): Response => {
  const responseBody: SuccessResponse<T> = {
    success: true,
    message,
    data,
  };

  if (meta) {
    responseBody.meta = meta;
  }

  return res.status(statusCode).json(responseBody);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  code?: string,
  details?: unknown
): Response => {
  const responseBody: ErrorResponse = {
    success: false,
    message,
    code,
    details,
    data: null,
  };

  return res.status(statusCode).json(responseBody);
};
