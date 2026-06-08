import mongoose, { Schema, Document } from 'mongoose';

export enum CreditAction {
  PURCHASE = 'purchase',
  SUBSCRIPTION = 'subscription_grant',
  AI_USAGE = 'ai_usage',
  REFUND = 'refund',
  ADMIN_ADJUST = 'admin_adjustment',
  WELCOME_BONUS = 'welcome_bonus',
}

export interface CreditLedgerDocument extends Document {
  userId: mongoose.Types.ObjectId;
  action: CreditAction;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId: mongoose.Types.ObjectId | null;
  referenceModel: 'Message' | 'Subscription' | 'Manual' | null;
  createdAt: Date;
}

const creditLedgerSchema = new Schema<CreditLedgerDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(CreditAction),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      refPath: 'referenceModel',
      default: null,
    },
    referenceModel: {
      type: String,
      enum: ['Message', 'Subscription', 'Manual'],
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for paginated history
creditLedgerSchema.index({ userId: 1, createdAt: -1 });

export const CreditLedger = mongoose.model<CreditLedgerDocument>(
  'CreditLedger',
  creditLedgerSchema
);
