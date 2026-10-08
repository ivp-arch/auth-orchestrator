import { AuthError } from './errors';
import { StateStore, type Unsubscribe } from './events/state-store';
import { createProvider } from './providers/create-provider';
import { createTokenStorage } from './storage/create-token-storage';
import { TokenManager } from './tokens/token-manager';
import type { AuthConfig, AuthState } from './types';

/**
 * Main orchestrator: config in, Promise actions + subscribable state out.
 * Week 2 wires the provider, token storage and token layer; the sign-in and
 * sign-out flows arrive in Week 3 (Authorization Code + PKCE) and will use
 * the provider constructed here.
 */
export class AuthOrchestrator {
  private readonly store: StateStore<AuthState>;
  private readonly tokenManager: TokenManager;

  constructor(config: AuthConfig) {
    this.store = new StateStore<AuthState>({ status: 'initializing' });
    // Fail fast on an invalid provider/authority or storage config.
    // TODO Week 3: keep the provider instance and drive the redirect flows with it.
    createProvider(config);
    this.tokenManager = new TokenManager(
      createTokenStorage(config.tokenStorage),
      config.refresh?.skewSeconds ?? 0,
    );
  }

  getState(): AuthState {
    return this.store.getState();
  }

  subscribe(listener: (state: AuthState) => void): Unsubscribe {
    return this.store.subscribe(listener);
  }

  /**
   * The current access token, rejecting with a typed error when it cannot be
   * used (`ERR_TOKEN_MISSING` / `ERR_TOKEN_EXPIRED`).
   */
  async getAccessToken(): Promise<string> {
    return this.tokenManager.getValidAccessToken();
  }

  async signIn(): Promise<void> {
    // TODO Week 3: authorization-code + PKCE redirect flow
    throw new AuthError('ERR_NOT_IMPLEMENTED', 'Sign-in is not implemented yet — coming in Week 3');
  }

  async signOut(): Promise<void> {
    // TODO Week 3: end-session flow
    throw new AuthError(
      'ERR_NOT_IMPLEMENTED',
      'Sign-out is not implemented yet — coming in Week 3',
    );
  }
}
