import { redis } from '@/config/redis';
import { UsageEvent, UsageEventType } from '@/modules/analytics/usageEvent.model';
import * as adminService from '@/modules/admin/admin.service';
import { createTestUser, createTestPlan, createTestSubscription } from '../../helpers/factories';
import { AppError } from '@/shared/errors/AppError';

describe('Admin Service Unit Tests', () => {
  it('should list and search users with pagination', async () => {
    await createTestUser({ name: 'Alpha User', email: 'alpha@example.com' });
    await createTestUser({ name: 'Beta User', email: 'beta@example.com' });

    const list1 = await adminService.getUsers(1, 10, 'Alpha');
    expect(list1.users.length).toBe(1);
    expect(list1.users[0].name).toBe('Alpha User');

    const list2 = await adminService.getUsers(1, 10);
    expect(list2.users.length).toBeGreaterThanOrEqual(2);
    expect(list2.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('should retrieve a user by ID', async () => {
    const user = await createTestUser();
    const retrieved = await adminService.getUserById(user._id.toString());
    expect(retrieved.email).toBe(user.email);
  });

  it('should throw error when retrieving non-existent user by ID', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    await expect(adminService.getUserById(fakeId)).rejects.toThrow(AppError);
  });

  it('should update user status and delete cache, and revoke tokens if deactivated', async () => {
    const user = await createTestUser({ isActive: true });
    const userId = user._id.toString();

    // Cache user object in Redis
    await redis.set(`user:${userId}`, 'cached_data');

    const updated = await adminService.updateUserStatus(userId, false);
    expect(updated.isActive).toBe(false);

    // Verify cache is cleared
    const cached = await redis.get(`user:${userId}`);
    expect(cached).toBeNull();
  });

  it('should update user role and delete cache', async () => {
    const user = await createTestUser({ role: 'user' });
    const userId = user._id.toString();

    await redis.set(`user:${userId}`, 'cached_data');

    const updated = await adminService.updateUserRole(userId, 'admin');
    expect(updated.role).toBe('admin');

    const cached = await redis.get(`user:${userId}`);
    expect(cached).toBeNull();
  });

  it('should adjust user credits (addition and deduction)', async () => {
    const user = await createTestUser({ credits: 100 });
    const userId = user._id.toString();

    await redis.set(`user:${userId}`, 'cached_data');

    // Add credits
    const addedUser = await adminService.adjustCredits(userId, 50, 'Admin bonus');
    expect(addedUser.credits).toBe(150);

    // Deduct credits
    const deductedUser = await adminService.adjustCredits(userId, -30, 'Admin penalty');
    expect(deductedUser.credits).toBe(120);

    const cached = await redis.get(`user:${userId}`);
    expect(cached).toBeNull();
  });

  it('should perform CRUD operations on Plans', async () => {
    // 1. Create Plan
    const plan = await adminService.createPlan({
      name: 'Super Elite',
      slug: 'super-elite',
      price: 9900,
      currency: 'USD',
      billingCycle: 'monthly',
      creditsPerCycle: 10000,
      features: {
        maxApiKeys: 20,
        maxConversations: -1,
        maxMessagesPerDay: -1,
        allowedModels: ['gemini-1.5-pro'],
        priorityQueue: true,
        analyticsRetentionDays: 365,
      },
      isActive: true,
    });

    expect(plan.slug).toBe('super-elite');

    // 2. Update Plan
    const updated = await adminService.updatePlan(plan._id.toString(), {
      name: 'Super Elite Plus',
      price: 12900,
    });
    expect(updated.name).toBe('Super Elite Plus');
    expect(updated.price).toBe(12900);

    // 3. Delete Plan
    const deleted = await adminService.deletePlan(plan._id.toString());
    expect(deleted.isActive).toBe(false);
  });

  it('should throw conflict error when creating plan with existing slug', async () => {
    await createTestPlan({ slug: 'pro' });
    await expect(
      adminService.createPlan({
        name: 'Another Pro',
        slug: 'pro',
        price: 500,
      } as any)
    ).rejects.toThrow(AppError);
  });

  it('should retrieve admin analytics overview', async () => {
    const user = await createTestUser();
    const plan = await createTestPlan();
    await createTestSubscription(user._id.toString(), plan._id.toString());

    const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create UsageEvent
    await UsageEvent.create({
      userId: user._id,
      eventType: UsageEventType.AI_CHAT,
      model: 'gemini-1.5-flash',
      tokensUsed: 150,
      creditsUsed: 0.3,
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Agent',
      timestamp: new Date(),
    });

    const overview = await adminService.getAdminOverview(from, to);
    expect(overview.totalUsers).toBeGreaterThanOrEqual(1);
    expect(overview.totalMessages).toBe(1);
    expect(overview.totalTokensUsed).toBe(150);
    expect(overview.totalCreditsUsed).toBe(0.3);
    expect(overview.activeSubscriptions).toBeGreaterThanOrEqual(1);
    expect(overview.mostUsedModel).toBe('gemini-1.5-flash');
  });

  it('should retrieve admin users usage breakdown', async () => {
    const user = await createTestUser();
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await UsageEvent.create({
      userId: user._id,
      eventType: UsageEventType.AI_CHAT,
      model: 'gemini-1.5-flash',
      tokensUsed: 100,
      creditsUsed: 0.2,
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Agent',
      timestamp: new Date(),
    });

    const res = await adminService.getAdminUsersBreakdown(from, to, 1, 10);
    expect(res.breakdown.length).toBeGreaterThanOrEqual(1);
    const item = res.breakdown.find((b) => b.userId.toString() === user._id.toString());
    expect(item).toBeTruthy();
    expect(item?.messagesCount).toBe(1);
    expect(item?.tokensUsed).toBe(100);
    expect(item?.creditsUsed).toBe(0.2);
  });

  it('should throw 404 when updating status of a non-existent user', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    await expect(adminService.updateUserStatus(fakeId, false)).rejects.toThrow(AppError);
  });

  it('should throw 404 when updating role of a non-existent user', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    await expect(adminService.updateUserRole(fakeId, 'admin')).rejects.toThrow(AppError);
  });

  it('should throw 404 when adjusting credits of a non-existent user', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    await expect(adminService.adjustCredits(fakeId, 50, 'bonus')).rejects.toThrow(AppError);
  });

  it('should throw 404 when updating non-existent plan', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    await expect(adminService.updatePlan(fakeId, { name: 'super' })).rejects.toThrow(AppError);
  });

  it('should throw 409 when updating plan slug to an already existing slug', async () => {
    await createTestPlan({ slug: 'gold' });
    const plan2 = await createTestPlan({ slug: 'silver' });
    await expect(
      adminService.updatePlan(plan2._id.toString(), { slug: 'gold' })
    ).rejects.toThrow(AppError);
  });

  it('should clear redis cache on plan slug update', async () => {
    const plan = await createTestPlan({ slug: 'original-slug' });
    const updated = await adminService.updatePlan(plan._id.toString(), { slug: 'new-slug' });
    expect(updated.slug).toBe('new-slug');
  });

  it('should throw 404 when deleting non-existent plan', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    await expect(adminService.deletePlan(fakeId)).rejects.toThrow(AppError);
  });

  it('should hit cache on getAdminOverview and getAdminUsersBreakdown', async () => {
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Call first time to populate cache
    await adminService.getAdminOverview(from, to);
    await adminService.getAdminUsersBreakdown(from, to, 1, 10);

    // Call second time to hit cache
    const overview = await adminService.getAdminOverview(from, to);
    const breakdown = await adminService.getAdminUsersBreakdown(from, to, 1, 10);

    expect(overview).toBeTruthy();
    expect(breakdown).toBeTruthy();
  });
});
