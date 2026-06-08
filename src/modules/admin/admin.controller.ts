import { Request, Response } from 'express';
import crypto from 'crypto';
import * as adminService from './admin.service';
import { sendSuccess } from '@/shared/utils/response';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { parsePagination } from '@/shared/utils/pagination';
import { redis } from '@/config/redis';

export const getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = parsePagination(req);
  const search = req.query.search as string | undefined;
  const sort = req.query.sort as string | undefined;

  const result = await adminService.getUsers(page, limit, search, sort);
  sendSuccess(res, 200, 'Users retrieved successfully', result.users, result.meta);
});

export const getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = await adminService.getUserById(id);
  sendSuccess(res, 200, 'User details retrieved successfully', user);
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { isActive } = req.body;

  const user = await adminService.updateUserStatus(id, isActive);
  const message = isActive ? 'User unbanned successfully' : 'User banned successfully';
  sendSuccess(res, 200, message, user);
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body;

  const user = await adminService.updateUserRole(id, role);
  sendSuccess(res, 200, 'User role updated successfully', user);
});

export const adjustCredits = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId, amount, description } = req.body;

  const user = await adminService.adjustCredits(userId, amount, description);
  sendSuccess(res, 200, 'Credits adjusted successfully', user);
});

export const createPlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const plan = await adminService.createPlan(req.body);
  sendSuccess(res, 201, 'Plan created successfully', plan);
});

export const updatePlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const plan = await adminService.updatePlan(id, req.body);
  sendSuccess(res, 200, 'Plan updated successfully', plan);
});

export const deletePlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const plan = await adminService.deletePlan(id);
  sendSuccess(res, 200, 'Plan soft-deleted successfully', plan);
});

export const getOverviewAnalytics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const fromStr = req.query.from as string | undefined;
    const toStr = req.query.to as string | undefined;

    const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    from.setUTCHours(0, 0, 0, 0);

    const to = toStr ? new Date(toStr) : new Date();
    to.setUTCHours(23, 59, 59, 999);

    // X-Cache calculation
    const rangeHash = crypto
      .createHash('md5')
      .update(`${from.toISOString()}-${to.toISOString()}-admin-overview`)
      .digest('hex');
    const cacheKey = `analytics:admin:${rangeHash}`;
    const cached = await redis.get(cacheKey);
    res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');

    const result = await adminService.getAdminOverview(from, to);
    sendSuccess(res, 200, 'Admin overview analytics retrieved successfully', result);
  }
);

export const getUsersAnalytics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const fromStr = req.query.from as string | undefined;
    const toStr = req.query.to as string | undefined;
    const { page, limit } = parsePagination(req);

    const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    from.setUTCHours(0, 0, 0, 0);

    const to = toStr ? new Date(toStr) : new Date();
    to.setUTCHours(23, 59, 59, 999);

    // X-Cache calculation
    const rangeHash = crypto
      .createHash('md5')
      .update(`${from.toISOString()}-${to.toISOString()}-admin-users`)
      .digest('hex');
    const cacheKey = `analytics:admin:${rangeHash}:${page}:${limit}`;
    const cached = await redis.get(cacheKey);
    res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');

    const result = await adminService.getAdminUsersBreakdown(from, to, page, limit);
    sendSuccess(
      res,
      200,
      'Admin users usage analytics retrieved successfully',
      result.breakdown,
      result.meta
    );
  }
);
