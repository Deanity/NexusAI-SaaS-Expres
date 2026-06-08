import mongoose from 'mongoose';
import { User } from '@/modules/user/user.model';
import {
  CreditLedger,
  CreditAction,
  CreditLedgerDocument,
} from '@/modules/credit/creditLedger.model';
import { AppError } from '@/shared/errors/AppError';
import { getPaginationMeta } from '@/shared/utils/pagination';

interface PaginatedLedger {
  history: CreditLedgerDocument[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const deductCredits = async (
  userId: string,
  amount: number,
  action: CreditAction = CreditAction.AI_USAGE,
  referenceId: string | null = null,
  referenceModel: 'Message' | 'Subscription' | 'Manual' | null = null,
  description = 'AI Usage deduction'
): Promise<void> => {
  if (amount <= 0) {
    throw new AppError('Deduction amount must be greater than 0', 400, 'VALIDATION_ERROR');
  }

  const executeDeduction = async (session?: mongoose.ClientSession): Promise<void> => {
    const user = await User.findOneAndUpdate(
      { _id: userId, credits: { $gte: amount } },
      { $inc: { credits: -amount } },
      { new: true, session }
    );

    if (!user) {
      throw new AppError('Insufficient credits', 422, 'INSUFFICIENT_CREDITS');
    }

    await CreditLedger.create(
      [
        {
          userId,
          action,
          amount: -amount,
          balanceAfter: user.credits,
          description,
          referenceId: referenceId ? new mongoose.Types.ObjectId(referenceId) : null,
          referenceModel,
        },
      ],
      { session }
    );
  };

  // Try utilizing Mongoose transactions
  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    await executeDeduction(session);
    await session.commitTransaction();
  } catch (error: unknown) {
    if (session) {
      await session.abortTransaction();
    }

    const err = error as Error;
    // Fallback for local standalone MongoDB instances
    const isReplicaSetError =
      err.message &&
      (err.message.includes('Replica Set member') ||
        err.message.includes('transaction') ||
        err.message.includes('Transaction'));

    if (isReplicaSetError) {
      await executeDeduction();
    } else {
      throw error;
    }
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

export const addCredits = async (
  userId: string,
  amount: number,
  action: CreditAction,
  referenceId: string | null = null,
  referenceModel: 'Message' | 'Subscription' | 'Manual' | null = null,
  description = 'Credit top-up'
): Promise<void> => {
  if (amount <= 0) {
    throw new AppError('Credit top-up amount must be greater than 0', 400, 'VALIDATION_ERROR');
  }

  const executeTopUp = async (session?: mongoose.ClientSession): Promise<void> => {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { credits: amount } },
      { new: true, session }
    );

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    await CreditLedger.create(
      [
        {
          userId,
          action,
          amount,
          balanceAfter: user.credits,
          description,
          referenceId: referenceId ? new mongoose.Types.ObjectId(referenceId) : null,
          referenceModel,
        },
      ],
      { session }
    );
  };

  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    await executeTopUp(session);
    await session.commitTransaction();
  } catch (error: unknown) {
    if (session) {
      await session.abortTransaction();
    }

    const err = error as Error;
    // Fallback for local standalone MongoDB instances
    const isReplicaSetError =
      err.message &&
      (err.message.includes('Replica Set member') ||
        err.message.includes('transaction') ||
        err.message.includes('Transaction'));

    if (isReplicaSetError) {
      await executeTopUp();
    } else {
      throw error;
    }
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

export const getBalance = async (userId: string): Promise<number> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return user.credits;
};

export const getHistory = async (
  userId: string,
  page: number,
  limit: number
): Promise<PaginatedLedger> => {
  const skip = (page - 1) * limit;

  const [history, total] = await Promise.all([
    CreditLedger.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    CreditLedger.countDocuments({ userId }),
  ]);

  const meta = getPaginationMeta(page, limit, total);

  return {
    history,
    meta,
  };
};
