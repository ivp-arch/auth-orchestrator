import { describe, expect, it } from 'vitest';
import { ConfigError } from '../../src/errors';
import { createTokenStorage } from '../../src/storage/create-token-storage';
import { InMemoryTokenStorage } from '../../src/storage/in-memory-token-storage';
import { SessionStorageTokenStorage } from '../../src/storage/session-storage-token-storage';
import type { TokenSet, TokenStorage } from '../../src/types';

const customStorage: TokenStorage = {
  async getTokens(): Promise<TokenSet | null> {
    return null;
  },
  async setTokens(): Promise<void> {},
  async clear(): Promise<void> {},
};

describe('createTokenStorage', () => {
  it('defaults to the in-memory backend', () => {
    expect(createTokenStorage(undefined)).toBeInstanceOf(InMemoryTokenStorage);
  });

  it('resolves the named backends', () => {
    expect(createTokenStorage('memory')).toBeInstanceOf(InMemoryTokenStorage);
    expect(createTokenStorage('sessionStorage')).toBeInstanceOf(SessionStorageTokenStorage);
  });

  it('passes a custom TokenStorage instance through untouched', () => {
    expect(createTokenStorage(customStorage)).toBe(customStorage);
  });

  it('throws ConfigError for the not-yet-implemented cookie backend', () => {
    expect.hasAssertions();
    try {
      createTokenStorage({ type: 'cookie', backend: '/api/auth' });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).code).toBe('ERR_CONFIG');
    }
  });
});
