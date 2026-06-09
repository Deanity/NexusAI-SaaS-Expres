import { signAccessToken } from '@/shared/utils/token';

export const getAuthHeader = (userId: string, role: string = 'user'): { Authorization: string } => {
  const token = signAccessToken(userId, role);
  return { Authorization: `Bearer ${token}` };
};
