import mongoose, { Schema, Document } from 'mongoose';

export interface PlanDocument extends Document {
  name: string;
  slug: string;
  price: number;
  currency: 'USD' | 'IDR';
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  creditsPerCycle: number;
  features: {
    maxApiKeys: number;
    maxConversations: number;
    maxMessagesPerDay: number;
    allowedModels: string[];
    priorityQueue: boolean;
    analyticsRetentionDays: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<PlanDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: ['USD', 'IDR'],
      default: 'USD',
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      default: 'monthly',
    },
    creditsPerCycle: {
      type: Number,
      required: true,
    },
    features: {
      maxApiKeys: {
        type: Number,
        required: true,
      },
      maxConversations: {
        type: Number,
        required: true,
      },
      maxMessagesPerDay: {
        type: Number,
        required: true,
      },
      allowedModels: {
        type: [String],
        required: true,
      },
      priorityQueue: {
        type: Boolean,
        default: false,
      },
      analyticsRetentionDays: {
        type: Number,
        required: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Plan = mongoose.model<PlanDocument>('Plan', planSchema);
