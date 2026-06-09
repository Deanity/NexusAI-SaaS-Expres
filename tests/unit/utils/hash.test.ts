import { hashSHA256, hashBcrypt, compareBcrypt } from '@/shared/utils/hash';

describe('Hash Utility Unit Tests', () => {
  it('should correctly hash data using SHA-256', () => {
    const data = 'my-secret-key';
    const hash1 = hashSHA256(data);
    const hash2 = hashSHA256(data);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex is 64 characters
    expect(hash1).not.toBe(data);
  });

  it('should correctly hash and compare using bcrypt', async () => {
    const password = 'mySecurePassword123';
    const hash = await hashBcrypt(password);

    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);

    const match = await compareBcrypt(password, hash);
    expect(match).toBe(true);

    const nonMatch = await compareBcrypt('wrongPassword', hash);
    expect(nonMatch).toBe(false);
  });
});
