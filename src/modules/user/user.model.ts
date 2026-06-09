import mongoose, { Schema, Document } from 'mongoose';
import { hashBcrypt, compareBcrypt } from '@/shared/utils/hash';

export interface UserDocument extends Document {
  email: string;
  password?: string;
  name: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  isActive: boolean;
  credits: number;
  subscriptionId: mongoose.Types.ObjectId | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plainText: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Exclude password from query results by default
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    credits: {
      type: Number,
      default: 0,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password
userSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    if (this.password) {
      this.password = await hashBcrypt(this.password, 12);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Post-save hook to invalidate cache
userSchema.post<UserDocument>('save', async function (doc) {
  try {
    const { redis } = await import('@/config/redis');
    await redis.del(`user:${doc._id.toString()}`);
  } catch (error) {
    // Ignore cache deletion error on save
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  this: UserDocument,
  plainText: string
): Promise<boolean> {
  // If the password field is not selected/loaded, we cannot compare
  if (!this.password) {
    return false;
  }
  return compareBcrypt(plainText, this.password);
};

export const User = mongoose.model<UserDocument>('User', userSchema);
