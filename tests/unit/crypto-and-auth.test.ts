import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../../src/utils/crypto.js';
import { Role } from '../../src/types/index.js';
import { UnauthorizedError } from '../../src/utils/errors.js';

describe('Crypto & Auth Unit Tests', () => {
  it('hashes and verifies passwords correctly', async () => {
    const rawPassword = 'SecretPassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2')).toBe(true);

    const matches = await comparePassword(rawPassword, hash);
    expect(matches).toBe(true);

    const wrongMatches = await comparePassword('WrongPassword', hash);
    expect(wrongMatches).toBe(false);
  });

  it('generates and verifies signed JWT tokens', () => {
    const payload = {
      userId: 'user-uuid-1',
      email: 'user@example.com',
      role: Role.CONTESTANT,
      contestantId: 'contestant-uuid-1',
    };

    const token = generateToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const verified = verifyToken(token);
    expect(verified.userId).toBe(payload.userId);
    expect(verified.email).toBe(payload.email);
    expect(verified.role).toBe(payload.role);
    expect(verified.contestantId).toBe(payload.contestantId);
  });

  it('throws UnauthorizedError for tampered or invalid JWT tokens', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow(UnauthorizedError);
  });
});
