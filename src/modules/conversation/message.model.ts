import mongoose, { Schema, Document } from 'mongoose';

export interface MessageDocument extends Omit<Document, 'model'> {
  conversationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string | null;
  tokensUsed: number;
  creditsDeducted: number;
  latencyMs: number | null;
  finishReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const messageSchema = new Schema<MessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      default: null,
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
    creditsDeducted: {
      type: Number,
      default: 0,
    },
    latencyMs: {
      type: Number,
      default: null,
    },
    finishReason: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for sorted message list
messageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model<MessageDocument>('Message', messageSchema);
