import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenError } from '../../src/errors';
import { TokenManager } from '../../src/tokens/token-manager';
import type { TokenSet, TokenStorage } from '../../src/types';

function makeTokenSet(overrides?: Partial<TokenSet>): TokenSet {
  return {
    accessToken: 'access-token-value',
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

/** Fully controllable in-memory storage; failure modes are simulated by assigning `mode`. */
function stubStorage(tokens: TokenSet | null, mode: 'ok' | 'fail' = 'ok'): TokenStorage {
  return {
    async getTokens() {
      if (mode === 'fail') throw new Error('backend getTokens failed');
      return tokens;
    },
    async setTokens(next: TokenSet) {
      if (mode === 'fail') throw new Error('backend setTokens failed');
      tokens = next;
    },
    async clear() {
      tokens = null;
    },
  };
}

describe('TokenManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the stored access token while it is valid', async () => {
    const manager = new TokenManager(stubStorage(makeTokenSet()));
    await expect(manager.getValidAccessToken()).resolves.toBe('access-token-value');
  });

  it('rejects with ERR_TOKEN_MISSING when nothing is stored', async () => {
    const manager = new TokenManager(stubStorage(null));
    const error = await manager.getValidAccessToken().catch((e: TokenError) => e);
    expect(error).toBeInstanceOf(TokenError);
    expect(error.code).toBe('ERR_TOKEN_MISSING');
  });

  it('rejects with ERR_TOKEN_EXPIRED when the token is expired', async () => {
    const manager = new TokenManager(
      stubStorage(makeTokenSet({ expiresAt: new Date(Date.now()) })),
    );
    const error = await manager.getValidAccessToken().catch((e: TokenError) => e);
    expect(error).toBeInstanceOf(TokenError);
    expect(error.code).toBe('ERR_TOKEN_EXPIRED');
  });

  it('honors the configured refresh skew', async () => {
    // Still valid for 5s, but a 10s skew marks it as expired.
    const manager = new TokenManager(
      stubStorage(makeTokenSet({ expiresAt: new Date(Date.now() + 5_000) })),
      10,
    );
    const error = await manager.getValidAccessToken().catch((e: TokenError) => e);
    expect(error).toBeInstanceOf(TokenError);
    expect(error.code).toBe('ERR_TOKEN_EXPIRED');
  });

  it('never leaks token values in error messages', async () => {
    const manager = new TokenManager(
      stubStorage(makeTokenSet({ expiresAt: new Date(Date.now()) })),
    );
    const error = await manager.getValidAccessToken().catch((e: TokenError) => e);
    expect(error.message).not.toContain('access-token-value');
  });

  it('stores and clears tokens through the backend', async () => {
    const storage = stubStorage(null);
    const manager = new TokenManager(storage);

    await manager.storeTokens(makeTokenSet());
    await expect(manager.getValidAccessToken()).resolves.toBe('access-token-value');

    await manager.clear();
    const error = await manager.getValidAccessToken().catch((e: TokenError) => e);
    expect(error.code).toBe('ERR_TOKEN_MISSING');
  });

  it('propagates backend failures without swallowing them', async () => {
    const manager = new TokenManager(stubStorage(null, 'fail'));
    await expect(manager.getValidAccessToken()).rejects.toThrow('backend getTokens failed');
  });
});
