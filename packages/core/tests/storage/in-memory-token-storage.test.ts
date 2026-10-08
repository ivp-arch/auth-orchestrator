import { describe, expect, it } from 'vitest';
import { InMemoryTokenStorage } from '../../src/storage/in-memory-token-storage';
import type { TokenSet } from '../../src/types';

const fullTokenSet: TokenSet = {
  accessToken: 'access-token-value',
  refreshToken: 'refresh-token-value',
  idToken: 'id-token-value',
  expiresAt: new Date('2026-01-01T01:00:00Z'),
};

describe('InMemoryTokenStorage', () => {
  it('returns null before anything is stored', async () => {
    const storage = new InMemoryTokenStorage();
    await expect(storage.getTokens()).resolves.toBeNull();
  });

  it('round-trips a full token set', async () => {
    const storage = new InMemoryTokenStorage();
    await storage.setTokens(fullTokenSet);
    await expect(storage.getTokens()).resolves.toEqual(fullTokenSet);
  });

  it('round-trips a token set without optional tokens', async () => {
    const storage = new InMemoryTokenStorage();
    await storage.setTokens({
      accessToken: 'access-token-value',
      expiresAt: new Date('2026-01-01T01:00:00Z'),
    });
    await expect(storage.getTokens()).resolves.toEqual({
      accessToken: 'access-token-value',
      expiresAt: new Date('2026-01-01T01:00:00Z'),
    });
  });

  it('clears everything on clear()', async () => {
    const storage = new InMemoryTokenStorage();
    await storage.setTokens(fullTokenSet);
    await storage.clear();
    await expect(storage.getTokens()).resolves.toBeNull();
  });
});
