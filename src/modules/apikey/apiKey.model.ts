import mongoose, { Schema, Document } from 'mongoose';

export enum ApiKeyScope {
  CHAT_WRITE = 'chat:write',
  HISTORY_READ = 'history:read',
  HISTORY_DELETE = 'history:delete',
  ANALYTICS_READ = 'analytics:read',
  CREDITS_READ = 'credits:read',
}

export interface ApiKeyDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: ApiKeyScope[];
  usageCount: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  ipWhitelist: string[];
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<ApiKeyDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    keyPrefix: {
      type: String,
      required: true,
      trim: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    scopes: {
      type: [String],
      enum: Object.values(ApiKeyScope),
      required: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    ipWhitelist: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const ApiKey = mongoose.model<ApiKeyDocument>('ApiKey', apiKeySchema);
