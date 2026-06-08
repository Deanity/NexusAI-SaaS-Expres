import mongoose, { Schema, Document } from 'mongoose';

export interface EmailVerificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  type: 'email_verify' | 'password_reset';
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

const emailVerificationSchema = new Schema<EmailVerificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['email_verify', 'password_reset'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const EmailVerification = mongoose.model<EmailVerificationDocument>(
  'EmailVerification',
  emailVerificationSchema
);
