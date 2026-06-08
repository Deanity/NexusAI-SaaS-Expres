import mongoose, { Schema, Document } from 'mongoose';

export enum UsageEventType {
  AI_CHAT = 'ai_chat',
  API_CALL = 'api_call',
  CREDIT_BUY = 'credit_buy',
  LOGIN = 'login',
}

export interface UsageEventDocument extends Omit<Document, 'model'> {
  userId: mongoose.Types.ObjectId;
  eventType: UsageEventType;
  model: string | null;
  tokensUsed: number;
  creditsUsed: number;
  conversationId: mongoose.Types.ObjectId | null;
  apiKeyId: mongoose.Types.ObjectId | null;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

const usageEventSchema = new Schema<UsageEventDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: Object.values(UsageEventType),
      required: true,
      index: true,
    },
    model: {
      type: String,
      default: null,
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
    creditsUsed: {
      type: Number,
      default: 0,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    apiKeyId: {
      type: Schema.Types.ObjectId,
      ref: 'ApiKey',
      default: null,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for user query analytics
usageEventSchema.index({ userId: 1, timestamp: -1 });

export const UsageEvent = mongoose.model<UsageEventDocument>('UsageEvent', usageEventSchema);
