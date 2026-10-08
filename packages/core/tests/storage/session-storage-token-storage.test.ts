import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigError, TokenError } from '../../src/errors';
import { SessionStorageTokenStorage } from '../../src/storage/session-storage-token-storage';

const STORAGE_KEY = 'auth-orchestrator:tokens';

/** Map-backed Storage for the injected-backend seam. */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => {
      map.clear();
    },
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  } as Storage;
}

function readRawKey(): string {
  return sessionStorage.getItem(STORAGE_KEY) ?? '';
}

describe('SessionStorageTokenStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('returns null when nothing is stored', async () => {
    const storage = new SessionStorageTokenStorage();
    await expect(storage.getTokens()).resolves.toBeNull();
  });

  it('round-trips a full token set, serializing dates as epoch ms', async () => {
    const storage = new SessionStorageTokenStorage();
    const expiresAt = new Date('2026-01-01T01:00:00Z');
    await storage.setTokens({
      accessToken: 'access-token-value',
      refreshToken: 'refresh-token-value',
      idToken: 'id-token-value',
      expiresAt,
    });

    const raw = JSON.parse(readRawKey()) as { expiresAt: number };
    expect(raw.expiresAt).toBe(expiresAt.getTime());

    await expect(storage.getTokens()).resolves.toEqual({
      accessToken: 'access-token-value',
      refreshToken: 'refresh-token-value',
      idToken: 'id-token-value',
      expiresAt,
    });
  });

  it('keeps absent optional tokens absent', async () => {
    const storage = new SessionStorageTokenStorage();
    await storage.setTokens({
      accessToken: 'access-token-value',
      expiresAt: new Date('2026-01-01T01:00:00Z'),
    });

    const payload = JSON.parse(readRawKey()) as Record<string, unknown>;
    expect('refreshToken' in payload).toBe(false);
    expect('idToken' in payload).toBe(false);

    const tokens = await storage.getTokens();
    expect(tokens).not.toBeNull();
    expect('refreshToken' in (tokens ?? {})).toBe(false);
    expect('idToken' in (tokens ?? {})).toBe(false);
  });

  it('writes exactly one key', async () => {
    const storage = new SessionStorageTokenStorage();
    await storage.setTokens({
      accessToken: 'access-token-value',
      expiresAt: new Date('2026-01-01T01:00:00Z'),
    });
    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('clears only its own key on clear()', async () => {
    const storage = new SessionStorageTokenStorage();
    sessionStorage.setItem('unrelated-app-key', 'keep-me');
    await storage.setTokens({
      accessToken: 'access-token-value',
      expiresAt: new Date('2026-01-01T01:00:00Z'),
    });

    await storage.clear();

    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem('unrelated-app-key')).toBe('keep-me');
  });

  it('rejects with TokenError when the stored payload is corrupted', async () => {
    const storage = new SessionStorageTokenStorage();
    sessionStorage.setItem(STORAGE_KEY, '{not valid json');
    const error = await storage.getTokens().catch((e: TokenError) => e);
    expect(error).toBeInstanceOf(TokenError);
    expect(error.code).toBe('ERR_TOKEN');
    expect(error.message).not.toContain('{not valid json');
  });

  it('rejects with TokenError when the stored payload is malformed', async () => {
    const storage = new SessionStorageTokenStorage();
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, accessToken: 123, expiresAt: Date.now() }),
    );
    const error = await storage.getTokens().catch((e: TokenError) => e);
    expect(error).toBeInstanceOf(TokenError);
    expect(error.code).toBe('ERR_TOKEN');
  });

  it('rejects with ConfigError when no sessionStorage backend is available', async () => {
    vi.stubGlobal('sessionStorage', undefined);
    const storage = new SessionStorageTokenStorage();
    const error = await storage.getTokens().catch((e: ConfigError) => e);
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.code).toBe('ERR_CONFIG');
  });

  it('uses the injected backend instead of the global one', async () => {
    const backend = memoryStorage();
    const storage = new SessionStorageTokenStorage(backend);
    const expiresAt = new Date('2026-01-01T01:00:00Z');
    await storage.setTokens({ accessToken: 'access-token-value', expiresAt });

    expect(backend.getItem(STORAGE_KEY)).not.toBeNull();
    expect(sessionStorage.length).toBe(0);
    await expect(storage.getTokens()).resolves.toEqual({
      accessToken: 'access-token-value',
      expiresAt,
    });
  });
});
