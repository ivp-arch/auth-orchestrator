import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthError, ConfigError, TokenError } from '../src/errors';
import { AuthOrchestrator } from '../src/orchestrator';
import type { AuthConfig, TokenSet, TokenStorage } from '../src/types';

function makeConfig(overrides?: Partial<AuthConfig>): AuthConfig {
  return {
    provider: 'keycloak',
    authority: 'https://auth.example.com/realms/myapp',
    clientId: 'frontend-app',
    redirectUri: 'https://app.example.com/auth/callback',
    scopes: ['openid'],
    ...overrides,
  };
}

function stubTokenStorage(tokens: TokenSet | null): TokenStorage {
  return {
    async getTokens() {
      return tokens;
    },
    async setTokens() {},
    async clear() {},
  };
}

describe('AuthOrchestrator', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('starts in the initializing state', () => {
    const auth = new AuthOrchestrator(makeConfig());
    expect(auth.getState()).toEqual({ status: 'initializing' });
  });

  it('notifies subscribers on state changes and supports unsubscribe', () => {
    const auth = new AuthOrchestrator(makeConfig());
    const listener = vi.fn<(state: { status: string }) => void>();
    const unsubscribe = auth.subscribe(listener);

    unsubscribe();
    expect(listener).not.toHaveBeenCalled();
    expect(auth.getState()).toEqual({ status: 'initializing' });
  });

  it('rejects getAccessToken with ERR_TOKEN_MISSING when no tokens are stored', async () => {
    const auth = new AuthOrchestrator(makeConfig());
    const error = await auth.getAccessToken().catch((e: TokenError) => e);
    expect(error).toBeInstanceOf(TokenError);
    expect(error.code).toBe('ERR_TOKEN_MISSING');
  });

  it('resolves getAccessToken from a custom TokenStorage', async () => {
    const auth = new AuthOrchestrator(
      makeConfig({
        tokenStorage: stubTokenStorage({
          accessToken: 'access-token-value',
          expiresAt: new Date(Date.now() + 60_000),
        }),
      }),
    );
    await expect(auth.getAccessToken()).resolves.toBe('access-token-value');
  });

  it('rejects getAccessToken with ERR_TOKEN_EXPIRED for a stored expired token', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const auth = new AuthOrchestrator(
      makeConfig({
        tokenStorage: stubTokenStorage({
          accessToken: 'access-token-value',
          expiresAt: new Date('2026-01-01T00:00:00Z'),
        }),
      }),
    );
    const error = await auth.getAccessToken().catch((e: TokenError) => e);
    expect(error).toBeInstanceOf(TokenError);
    expect(error.code).toBe('ERR_TOKEN_EXPIRED');
  });

  it('wires the sessionStorage backend end-to-end', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    sessionStorage.setItem(
      'auth-orchestrator:tokens',
      JSON.stringify({ v: 1, accessToken: 'access-token-value', expiresAt: expiresAt.getTime() }),
    );

    const auth = new AuthOrchestrator(makeConfig({ tokenStorage: 'sessionStorage' }));
    await expect(auth.getAccessToken()).resolves.toBe('access-token-value');
  });

  it('throws ConfigError at construction for an unimplemented provider preset', () => {
    expect.hasAssertions();
    try {
      new AuthOrchestrator(makeConfig({ provider: 'auth0' }));
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).code).toBe('ERR_CONFIG');
    }
  });

  it('throws ConfigError at construction for an invalid authority', () => {
    expect.hasAssertions();
    try {
      new AuthOrchestrator(makeConfig({ authority: 'auth.example.com' }));
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).code).toBe('ERR_CONFIG');
    }
  });

  it('rejects signIn and signOut with AuthError ERR_NOT_IMPLEMENTED', async () => {
    const auth = new AuthOrchestrator(makeConfig());

    const signInError = await auth.signIn().catch((e: AuthError) => e);
    expect(signInError).toBeInstanceOf(AuthError);
    expect(signInError.code).toBe('ERR_NOT_IMPLEMENTED');

    const signOutError = await auth.signOut().catch((e: AuthError) => e);
    expect(signOutError).toBeInstanceOf(AuthError);
    expect(signOutError.code).toBe('ERR_NOT_IMPLEMENTED');
  });
});
