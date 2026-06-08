import { Request } from 'express';

export const getCookie = (req: Request, name: string): string | null => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [key, val] = part.trim().split('=');
    if (key === name) {
      return val ? decodeURIComponent(val) : null;
    }
  }
  return null;
};
