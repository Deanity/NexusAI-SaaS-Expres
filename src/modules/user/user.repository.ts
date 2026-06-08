import { User, UserDocument } from '@/modules/user/user.model';
import { redis } from '@/config/redis';

export const findUserById = async (id: string): Promise<UserDocument | null> => {
  const cacheKey = `user:${id}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return User.hydrate(JSON.parse(cached)) as UserDocument;
  }
  const user = await User.findById(id);
  if (user) {
    await redis.set(cacheKey, JSON.stringify(user.toObject()), 'EX', 300);
  }
  return user;
};

export const findUserByEmail = async (email: string): Promise<UserDocument | null> => {
  return User.findOne({ email });
};

export const findUserByEmailWithPassword = async (email: string): Promise<UserDocument | null> => {
  return User.findOne({ email }).select('+password');
};

export const findUserByIdWithPassword = async (id: string): Promise<UserDocument | null> => {
  return User.findById(id).select('+password');
};

export const createUser = async (data: Partial<UserDocument>): Promise<UserDocument> => {
  return User.create(data);
};

export const updateUser = async (
  id: string,
  data: Partial<UserDocument>
): Promise<UserDocument | null> => {
  const user = await User.findByIdAndUpdate(id, { $set: data }, { new: true });
  if (user) {
    await redis.del(`user:${id}`);
  }
  return user;
};
