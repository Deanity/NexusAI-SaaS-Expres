import * as creditService from '@/modules/credit/credit.service';
import { createTestUser } from '../../helpers/factories';
import { User } from '@/modules/user/user.model';
import { CreditLedger, CreditAction } from '@/modules/credit/creditLedger.model';
import { AppError } from '@/shared/errors/AppError';
import mongoose from 'mongoose';

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

  it('should throw 404 when adding credits to a non-existent user', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(
      creditService.addCredits(fakeId, 100, CreditAction.PURCHASE)
    ).rejects.toThrow(
      expect.objectContaining({
        statusCode: 404,
        code: 'NOT_FOUND',
      })
    );
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

    const ledger = await CreditLedger.findOne({ userId: user._id, amount: -30 });
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

  it('should throw 422 when deducting credits from a non-existent user', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(
      creditService.deductCredits(fakeId, 10, CreditAction.AI_USAGE)
    ).rejects.toThrow(
      expect.objectContaining({
        statusCode: 422,
        code: 'INSUFFICIENT_CREDITS',
      })
    );
  });

  it('should return the correct balance of a user', async () => {
    const user = await createTestUser({ credits: 125 });

    const balance = await creditService.getBalance(user._id.toString());
    expect(balance).toBe(125);
  });

  it('should throw 404 when getting balance of a non-existent user', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(
      creditService.getBalance(fakeId)
    ).rejects.toThrow(
      expect.objectContaining({
        statusCode: 404,
        code: 'NOT_FOUND',
      })
    );
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

  it('should fallback to non-transaction top-up when replica set is not configured', async () => {
    const user = await createTestUser({ credits: 100 });
    const startSessionSpy = jest.spyOn(mongoose, 'startSession').mockRejectedValueOnce(
      new Error('Replica Set member error mock')
    );

    await creditService.addCredits(
      user._id.toString(),
      50,
      CreditAction.PURCHASE,
      null,
      'Manual',
      'Test replica set fallback top-up'
    );

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.credits).toBe(150);
    startSessionSpy.mockRestore();
  });

  it('should fallback to non-transaction deduction when replica set is not configured', async () => {
    const user = await createTestUser({ credits: 100 });
    const startSessionSpy = jest.spyOn(mongoose, 'startSession').mockRejectedValueOnce(
      new Error('Replica Set member error mock')
    );

    await creditService.deductCredits(
      user._id.toString(),
      30,
      CreditAction.AI_USAGE,
      null,
      'Message',
      'Test replica set fallback deduction'
    );

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.credits).toBe(70);
    startSessionSpy.mockRestore();
  });

  it('should throw original error if addCredits transaction fails with non-replica set error', async () => {
    const user = await createTestUser({ credits: 100 });
    const startSessionSpy = jest.spyOn(mongoose, 'startSession').mockRejectedValueOnce(
      new Error('Some generic database crash')
    );

    await expect(
      creditService.addCredits(user._id.toString(), 50, CreditAction.PURCHASE)
    ).rejects.toThrow('Some generic database crash');

    startSessionSpy.mockRestore();
  });

  it('should throw original error if deductCredits transaction fails with non-replica set error', async () => {
    const user = await createTestUser({ credits: 100 });
    const startSessionSpy = jest.spyOn(mongoose, 'startSession').mockRejectedValueOnce(
      new Error('Some generic database crash')
    );

    await expect(
      creditService.deductCredits(user._id.toString(), 30, CreditAction.AI_USAGE)
    ).rejects.toThrow('Some generic database crash');

    startSessionSpy.mockRestore();
  });
});
