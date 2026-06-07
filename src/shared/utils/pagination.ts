import { Request } from 'express';

interface ParsedPagination {
  page: number;
  limit: number;
  skip: number;
}

export const parsePagination = (
  req: Request,
  defaultLimit = 20,
  maxLimit = 100
): ParsedPagination => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  let limit = parseInt(req.query.limit as string, 10) || defaultLimit;

  if (limit <= 0) {
    limit = defaultLimit;
  }
  limit = Math.min(maxLimit, limit);

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};

interface MetaData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const getPaginationMeta = (page: number, limit: number, total: number): MetaData => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
  };
};
