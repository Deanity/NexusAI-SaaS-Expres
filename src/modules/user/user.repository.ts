import { User, UserDocument } from '@/modules/user/user.model';

export const findUserById = async (id: string): Promise<UserDocument | null> => {
  return User.findById(id);
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
  return User.findByIdAndUpdate(id, { $set: data }, { new: true });
};
