import { Plan } from '@/modules/subscription/plan.model';
import { SubscriptionStatus } from '@/modules/subscription/subscription.model';
import * as subscriptionService from '@/modules/subscription/subscription.service';
import { createTestUser, createTestPlan, createTestSubscription } from '../../helpers/factories';
import { User } from '@/modules/user/user.model';
import { CreditLedger, CreditAction } from '@/modules/credit/creditLedger.model';

describe('Subscription Service Unit Tests', () => {
  it('should successfully get active plans', async () => {
    // Clear and create 2 plans (one active, one inactive)
    await Plan.deleteMany({});
    await createTestPlan({ name: 'Active Pro', slug: 'active-pro', isActive: true });
    await createTestPlan({ name: 'Inactive Pro', slug: 'inactive-pro', isActive: false });

    const plans = await subscriptionService.getActivePlans();
    expect(plans.length).toBe(1);
    expect(plans[0].slug).toBe('active-pro');
  });

  it('should get plan by slug', async () => {
    await createTestPlan({ name: 'Pro Plan', slug: 'pro-slug', isActive: true });

    const plan = await subscriptionService.getPlanBySlug('pro-slug');
    expect(plan).toBeTruthy();
    expect(plan?.name).toBe('Pro Plan');
  });

  it('should successfully subscribe a user to a plan and grant credits', async () => {
    const user = await createTestUser({ credits: 10 });
    const plan = await createTestPlan({ creditsPerCycle: 500 });

    const subscription = await subscriptionService.subscribe(
      user._id.toString(),
      plan._id.toString()
    );

    expect(subscription).toBeTruthy();
    expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);

    // Verify user profile updated
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.subscriptionId?.toString()).toBe(subscription._id.toString());
    expect(updatedUser?.credits).toBe(510); // 10 + 500

    // Verify credit ledger logged
    const ledger = await CreditLedger.findOne({ userId: user._id });
    expect(ledger).toBeTruthy();
    expect(ledger?.amount).toBe(500);
    expect(ledger?.action).toBe(CreditAction.SUBSCRIPTION);
  });

  it('should successfully retrieve current active subscription', async () => {
    const user = await createTestUser();
    const plan = await createTestPlan();
    const sub = await createTestSubscription(user._id.toString(), plan._id.toString());

    const currentSub = await subscriptionService.getCurrentSubscription(user._id.toString());
    expect(currentSub).toBeTruthy();
    expect(currentSub?._id.toString()).toBe(sub._id.toString());
  });

  it('should successfully cancel a subscription at period end', async () => {
    const user = await createTestUser();
    const plan = await createTestPlan();
    await createTestSubscription(user._id.toString(), plan._id.toString());

    const cancelledSub = await subscriptionService.cancelSubscription(user._id.toString());
    expect(cancelledSub.cancelAtPeriodEnd).toBe(true);
    expect(cancelledSub.cancelledAt).toBeTruthy();
  });
});
