import * as creditService from '@/modules/credit/credit.service';
import { createTestUser } from '../../helpers/factories';
import { User } from '@/modules/user/user.model';
import { CreditLedger, CreditAction } from '@/modules/credit/creditLedger.model';
import { AppError } from '@/shared/errors/AppError';

describe('Credit Service Unit Tests', () => {
  it('should successfully add credits to a user and log in ledger', async () => {
    const user = await createTestUser({ credits: 100 });

    await creditService.addCredits(
      user._id.toString(),
      50,
      CreditAction.PURCHASE,
      null,
      'Manual',
      'Test manual addition'
    );

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.credits).toBe(150);

    const ledger = await CreditLedger.findOne({ userId: user._id });
    expect(ledger).toBeTruthy();
    expect(ledger?.amount).toBe(50);
    expect(ledger?.balanceAfter).toBe(150);
    expect(ledger?.action).toBe(CreditAction.PURCHASE);
    expect(ledger?.description).toBe('Test manual addition');
  });

  it('should throw an error when adding 0 or negative credits', async () => {
    const user = await createTestUser({ credits: 100 });

    await expect(
      creditService.addCredits(user._id.toString(), 0, CreditAction.PURCHASE)
    ).rejects.toThrow(AppError);

    await expect(
      creditService.addCredits(user._id.toString(), -10, CreditAction.PURCHASE)
    ).rejects.toThrow(AppError);
  });

  it('should successfully deduct credits from a user and log in ledger', async () => {
    const user = await createTestUser({ credits: 100 });

    await creditService.deductCredits(
      user._id.toString(),
      30,
      CreditAction.AI_USAGE,
      null,
      'Message',
      'Test AI deduction'
    );

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.credits).toBe(70);

    const ledger = await CreditLedger.findOne({ userId: user._id });
    expect(ledger).toBeTruthy();
    expect(ledger?.amount).toBe(-30);
    expect(ledger?.balanceAfter).toBe(70);
    expect(ledger?.action).toBe(CreditAction.AI_USAGE);
    expect(ledger?.description).toBe('Test AI deduction');
  });

  it('should throw insufficient credits error if deduction exceeds balance', async () => {
    const user = await createTestUser({ credits: 20 });

    await expect(
      creditService.deductCredits(user._id.toString(), 50, CreditAction.AI_USAGE)
    ).rejects.toThrow(AppError);
  });

  it('should throw error when deducting 0 or negative credits', async () => {
    const user = await createTestUser({ credits: 100 });

    await expect(
      creditService.deductCredits(user._id.toString(), 0, CreditAction.AI_USAGE)
    ).rejects.toThrow(AppError);
  });

  it('should return the correct balance of a user', async () => {
    const user = await createTestUser({ credits: 125 });

    const balance = await creditService.getBalance(user._id.toString());
    expect(balance).toBe(125);
  });

  it('should retrieve credit history and support pagination', async () => {
    const user = await createTestUser({ credits: 100 });
    const userId = user._id.toString();

    // Create 3 ledger entries
    await creditService.addCredits(userId, 10, CreditAction.WELCOME_BONUS);
    await creditService.deductCredits(userId, 5, CreditAction.AI_USAGE);
    await creditService.addCredits(userId, 20, CreditAction.PURCHASE);

    const res = await creditService.getHistory(userId, 1, 2);
    expect(res.history.length).toBe(2);
    expect(res.meta.total).toBe(3);
    expect(res.meta.totalPages).toBe(2);
    expect(res.meta.page).toBe(1);
    expect(res.meta.limit).toBe(2);
  });
});
