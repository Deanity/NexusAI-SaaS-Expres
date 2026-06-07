import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const hashSHA256 = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

export const hashBcrypt = async (plainText: string, saltRounds = 12): Promise<string> => {
  return bcrypt.hash(plainText, saltRounds);
};

export const compareBcrypt = async (plainText: string, hashedText: string): Promise<boolean> => {
  return bcrypt.compare(plainText, hashedText);
};
