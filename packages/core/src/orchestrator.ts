import { AuthError, StateError } from './errors';
import { StateStore, type Unsubscribe } from './events/state-store';
import { buildAuthorizationUrl, createSignInFlowState } from './flows/authorization-request';
import { type BrowserLocation, defaultBrowserLocation } from './flows/browser-location';
import {
  completeAuthorizationCallback,
  isAuthorizationCallback,
  stripResponseParams,
} from './flows/callback';
import { buildEndSessionUrl } from './flows/end-session';
import { FlowStateStorage, isFlowStateFresh } from './flows/flow-state';
import { createProvider } from './providers/create-provider';
import { createTokenStorage } from './storage/create-token-storage';
import { TokenManager } from './tokens/token-manager';
import type {
  AuthConfig,
  AuthErrorLike,
  AuthState,
  Provider,
  ProviderMetadata,
  TokenSet,
} from './types';

/** Normalizes any thrown value into the `AuthErrorLike` shape the state exposes. */
function toErrorLike(error: unknown): AuthErrorLike {
  if (error instanceof AuthError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { code: 'ERR_FLOW', message: error.message };
  }
  return { code: 'ERR_FLOW', message: 'An unexpected failure occurred during the auth flow.' };
}

/**
 * Main orchestrator: config in, Promise actions + subscribable state out.
 * Implements the Authorization Code + PKCE (S256) redirect flow on top of the
 * provider, the flow-state storage and the token layer.
 */
export class AuthOrchestrator {
  private readonly store: StateStore<AuthState>;
  private readonly tokenManager: TokenManager;
  private readonly provider: Provider;
  private readonly config: AuthConfig;
  private readonly flowStateStorage: FlowStateStorage;
  private readonly location: BrowserLocation;
  private metadata: ProviderMetadata | undefined;
  private initPromise: Promise<void> | undefined;

  constructor(config: AuthConfig) {
    this.config = config;
    this.store = new StateStore<AuthState>({ status: 'initializing' });
    // Fail fast on an invalid provider/authority or storage config.
    this.provider = createProvider(config);
    this.tokenManager = new TokenManager(
      createTokenStorage(config.tokenStorage),
      config.refresh?.skewSeconds ?? 0,
    );
    this.flowStateStorage = new FlowStateStorage();
    this.location = defaultBrowserLocation;
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

  /**
   * Boots the state machine: detects a pending authorization callback on the
   * URL and completes it, otherwise settles to `unauthenticated`.
   *
   * Call it once when the app starts (the adapters will do this for you).
   * Idempotent — concurrent calls share the same promise (StrictMode-safe).
   * It never rejects: initialization errors are observable in the state as
   * `unauthenticated` with an `error` field.
   */
  initialize(): Promise<void> {
    this.initPromise ??= this.runInitialization();
    return this.initPromise;
  }

  /**
   * Starts the Authorization Code + PKCE redirect flow: stores the flow state
   * (verifier, `state`, `nonce`) and navigates to the provider.
   * No-op when already authenticated; rejects while a sign-in is in flight.
   */
  async signIn(): Promise<void> {
    await this.initialize();
    const state = this.getState();
    if (state.status === 'authenticated') {
      return;
    }
    if (state.status === 'authenticating') {
      throw new StateError('A sign-in is already in progress.');
    }

    const metadata = await this.getMetadata();
    const flow = createSignInFlowState(this.config.redirectUri);
    this.flowStateStorage.save(flow);
    const url = await buildAuthorizationUrl(metadata, this.config, flow);

    this.setState({ status: 'authenticating', flow: 'redirect' });
    try {
      this.location.assign(url.href);
    } catch (cause) {
      // Navigation failed (e.g. no `location` in a non-browser host): the
      // saved flow would be stale on the next attempt, so drop it.
      this.flowStateStorage.clear();
      this.setState({ status: 'unauthenticated' });
      throw cause;
    }
  }

  /**
   * Clears tokens and flow state locally (always), then navigates to the
   * provider's end-session endpoint when one exists — with `id_token_hint`
   * when an ID token is stored. Local state is `unauthenticated` before
   * navigating, so a failed navigation never leaves the app "signed in".
   */
  async signOut(): Promise<void> {
    await this.initialize();
    const tokens = await this.tokenManager.getTokens();
    await this.tokenManager.clear();
    this.flowStateStorage.clear();
    this.setState({ status: 'unauthenticated' });

    const metadata = await this.getMetadata();
    const endSessionUrl = buildEndSessionUrl(metadata, {
      postLogoutRedirectUri: this.config.postLogoutRedirectUri,
      idTokenHint: tokens?.idToken,
    });
    if (endSessionUrl) {
      this.location.assign(endSessionUrl.href);
    }
  }

  private setState(next: AuthState): void {
    this.store.setState(next);
  }

  /** Provider discovery, cached after the first call. */
  private async getMetadata(): Promise<ProviderMetadata> {
    this.metadata ??= await this.provider.getMetadata();
    return this.metadata;
  }

  private async runInitialization(): Promise<void> {
    const url = this.location.getUrl();
    if (isAuthorizationCallback(url)) {
      await this.handleAuthorizationCallback(url);
      return;
    }
    this.setState({ status: 'unauthenticated' });
  }

  /**
   * Exchanges the callback for tokens and the user. Failures settle the state
   * to `unauthenticated` with the error (the app must never stay stuck in
   * `initializing`), the flow state is always cleared and the URL is cleaned
   * of the OAuth response parameters — on success and on failure alike.
   */
  private async handleAuthorizationCallback(callbackUrl: string): Promise<void> {
    try {
      const flow = this.flowStateStorage.load();
      if (flow === null || !isFlowStateFresh(flow)) {
        throw new StateError(
          'No sign-in flow is in progress: the flow state is missing or has expired.',
          { code: 'ERR_FLOW_STATE' },
        );
      }
      const metadata = await this.getMetadata();
      const { user, tokens } = await completeAuthorizationCallback({
        metadata,
        config: this.config,
        callbackUrl,
        flow,
      });
      this.flowStateStorage.clear();
      await this.storeTokens(tokens);
      this.setState({ status: 'authenticated', user, expiresAt: tokens.expiresAt });
    } catch (cause) {
      this.flowStateStorage.clear();
      this.setState({ status: 'unauthenticated', error: toErrorLike(cause) });
    } finally {
      this.location.replaceUrl(stripResponseParams(callbackUrl));
    }
  }

  private async storeTokens(tokens: TokenSet): Promise<void> {
    await this.tokenManager.storeTokens(tokens);
  }
}
