import mongoose, { Schema, Document } from 'mongoose';

export interface ConversationDocument extends Omit<Document, 'model'> {
  userId: mongoose.Types.ObjectId;
  title: string;
  model: string;
  systemPrompt: string | null;
  messageCount: number;
  totalTokensUsed: number;
  isArchived: boolean;
  isPinned: boolean;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<ConversationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    systemPrompt: {
      type: String,
      default: null,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    totalTokensUsed: {
      type: Number,
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on userId and lastMessageAt for ordering
conversationSchema.index({ userId: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model<ConversationDocument>(
  'Conversation',
  conversationSchema
);
