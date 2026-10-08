import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NetworkError, StateError } from '../src/errors';
import { FlowStateStorage } from '../src/flows/flow-state';
import { AuthOrchestrator } from '../src/orchestrator';
import type { AuthConfig, AuthState } from '../src/types';
import {
  CLIENT_ID,
  createIdTokenKit,
  DISCOVERY_URL,
  discoveryDocument,
  type IdTokenKit,
  JWKS_URI,
  jsonResponse,
  REDIRECT_URI,
  stubFetch,
  stubLocation,
  TEST_METADATA,
  TOKEN_ENDPOINT,
} from './flows/helpers/idp';

let kit: IdTokenKit;

function makeConfig(overrides?: Partial<AuthConfig>): AuthConfig {
  return {
    provider: 'keycloak',
    authority: 'https://auth.example.com/realms/myapp',
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    scopes: ['profile'],
    ...overrides,
  };
}

/** Discovery-only fetch stub — enough for signIn and plain boots. */
function stubDiscoveryFetch(overrides?: { endSessionEndpoint?: string }) {
  return stubFetch((url) => {
    if (url === DISCOVERY_URL) {
      return jsonResponse(
        200,
        discoveryDocument({
          ...TEST_METADATA,
          ...(overrides?.endSessionEndpoint !== undefined
            ? { endSessionEndpoint: overrides.endSessionEndpoint }
            : {}),
        }),
      );
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  });
}

describe('AuthOrchestrator flows', () => {
  beforeAll(async () => {
    kit = await createIdTokenKit(TEST_METADATA.issuer, CLIENT_ID);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('initialize() settles to unauthenticated without any network call', async () => {
    stubLocation('https://app.example.com/');
    const fetchMock = stubDiscoveryFetch();

    const auth = new AuthOrchestrator(makeConfig());
    await auth.initialize();

    expect(auth.getState()).toEqual({ status: 'unauthenticated' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('initialize() is idempotent: concurrent calls share one transition', async () => {
    stubLocation('https://app.example.com/');
    const auth = new AuthOrchestrator(makeConfig());
    const transitions: AuthState[] = [];
    auth.subscribe((state) => transitions.push(state));

    const first = auth.initialize();
    const second = auth.initialize();
    expect(first).toBe(second);
    await first;
    expect(auth.initialize()).toBe(first);

    // initializing → unauthenticated: exactly one transition.
    expect(transitions).toEqual([{ status: 'unauthenticated' }]);
  });

  it('signIn() navigates to the provider with the PKCE parameters and saves the flow', async () => {
    const { assign } = stubLocation('https://app.example.com/');
    stubDiscoveryFetch();

    const auth = new AuthOrchestrator(makeConfig());
    await auth.signIn();

    const state = auth.getState();
    expect(state.status).toBe('authenticating');
    if (state.status === 'authenticating') {
      expect(state.flow).toBe('redirect');
    }

    expect(assign).toHaveBeenCalledTimes(1);
    const url = new URL(assign.mock.calls[0]?.[0] ?? '');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(url.searchParams.get('scope')).toBe('openid profile');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');

    // The flow saved in sessionStorage is bound to the request's state/nonce.
    const flow = new FlowStateStorage().load();
    expect(flow).not.toBeNull();
    expect(flow?.state).toBe(url.searchParams.get('state'));
    expect(flow?.nonce).toBe(url.searchParams.get('nonce'));
  });

  it('signIn() rejects with StateError while a sign-in is already in flight', async () => {
    stubLocation('https://app.example.com/');
    stubDiscoveryFetch();

    const auth = new AuthOrchestrator(makeConfig());
    await auth.signIn();

    const error = await auth.signIn().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StateError);
    expect((error as StateError).code).toBe('ERR_STATE');
  });

  it('completes a full round-trip: signIn, provider redirect back, initialize → authenticated', async () => {
    stubLocation('https://app.example.com/');
    stubDiscoveryFetch();
    const auth = new AuthOrchestrator(makeConfig());
    await auth.signIn();

    // The provider redirects back: reload with the response on the URL, a new
    // orchestrator instance and the flow state still in sessionStorage.
    const flow = new FlowStateStorage().load();
    expect(flow).not.toBeNull();
    const idToken = await kit.mintIdToken({ sub: 'user-1', nonce: flow?.nonce });
    stubFetch((url) => {
      if (url === DISCOVERY_URL) {
        return jsonResponse(200, discoveryDocument(TEST_METADATA));
      }
      if (url === TOKEN_ENDPOINT) {
        return jsonResponse(200, {
          access_token: 'access-token-value',
          token_type: 'Bearer',
          expires_in: 3600,
          id_token: idToken,
        });
      }
      if (url === JWKS_URI) {
        return jsonResponse(200, kit.jwks);
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    });
    const callbackUrl = new URL(`${REDIRECT_URI}?code=authz-code&state=${flow?.state}`);
    const { assign: reloadedAssign, replaceState } = stubLocation(callbackUrl.href);

    const reloaded = new AuthOrchestrator(makeConfig());
    await reloaded.initialize();

    const state = reloaded.getState();
    expect(state.status).toBe('authenticated');
    if (state.status === 'authenticated') {
      expect(state.user.sub).toBe('user-1');
      expect(state.expiresAt.getTime()).toBeGreaterThan(Date.now());
    }
    await expect(reloaded.getAccessToken()).resolves.toBe('access-token-value');

    // Flow state consumed, URL cleaned of the OAuth response parameters.
    expect(new FlowStateStorage().load()).toBeNull();
    expect(replaceState).toHaveBeenCalledWith(null, '', REDIRECT_URI);
    expect(reloadedAssign).not.toHaveBeenCalled();
  });

  it('settles to unauthenticated with ERR_FLOW_STATE when the callback has no flow state', async () => {
    const callbackUrl = `${REDIRECT_URI}?code=authz-code&state=some-state`;
    const { replaceState } = stubLocation(callbackUrl);
    stubDiscoveryFetch();

    const auth = new AuthOrchestrator(makeConfig());
    await auth.initialize(); // never rejects

    const state = auth.getState();
    expect(state.status).toBe('unauthenticated');
    if (state.status === 'unauthenticated') {
      expect(state.error?.code).toBe('ERR_FLOW_STATE');
    }
    expect(replaceState).toHaveBeenCalledWith(null, '', REDIRECT_URI);
  });

  it('settles to unauthenticated with ERR_FLOW_STATE when the flow state is stale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    new FlowStateStorage().save({
      codeVerifier: 'v'.repeat(43),
      state: 'old-state',
      nonce: 'old-nonce',
      redirectUri: REDIRECT_URI,
      createdAt: Date.now(),
    });
    vi.setSystemTime(new Date('2026-01-01T00:11:00Z')); // past the 10-minute TTL

    stubLocation(`${REDIRECT_URI}?code=authz-code&state=old-state`);
    stubDiscoveryFetch();

    const auth = new AuthOrchestrator(makeConfig());
    await auth.initialize();

    const state = auth.getState();
    expect(state.status).toBe('unauthenticated');
    if (state.status === 'unauthenticated') {
      expect(state.error?.code).toBe('ERR_FLOW_STATE');
    }
  });

  it('initialize() never rejects when the callback fails at network level: the error lands in the state', async () => {
    // A callback URL with a saved flow, but discovery cannot be fetched.
    new FlowStateStorage().save({
      codeVerifier: 'v'.repeat(43),
      state: 'some-state',
      nonce: 'some-nonce',
      redirectUri: REDIRECT_URI,
      createdAt: Date.now(),
    });
    stubLocation(`${REDIRECT_URI}?code=authz-code&state=some-state`);
    stubFetch(() => {
      throw new TypeError('network is down');
    });

    const auth = new AuthOrchestrator(makeConfig());
    await expect(auth.initialize()).resolves.toBeUndefined();

    const state = auth.getState();
    expect(state.status).toBe('unauthenticated');
    if (state.status === 'unauthenticated') {
      expect(state.error?.code).toBe('ERR_NETWORK');
    }
  });

  it('signIn() rejects with NetworkError when discovery fails', async () => {
    stubLocation('https://app.example.com/');
    stubFetch(() => {
      throw new TypeError('network is down');
    });

    const auth = new AuthOrchestrator(makeConfig());
    const error = await auth.signIn().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).code).toBe('ERR_NETWORK');
  });

  it('signOut() clears everything locally when the provider has no end-session endpoint', async () => {
    const { assign } = stubLocation('https://app.example.com/');
    stubDiscoveryFetch();

    sessionStorage.setItem(
      'auth-orchestrator:tokens',
      JSON.stringify({
        v: 1,
        accessToken: 'access-token-value',
        idToken: 'id-token-value',
        expiresAt: Date.now() + 60_000,
      }),
    );
    const auth = new AuthOrchestrator(makeConfig({ tokenStorage: 'sessionStorage' }));
    await auth.initialize();

    await auth.signOut();

    expect(auth.getState()).toEqual({ status: 'unauthenticated' });
    expect(sessionStorage.getItem('auth-orchestrator:tokens')).toBeNull();
    expect(sessionStorage.getItem('auth-orchestrator:flow')).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it('signOut() navigates to the end-session endpoint with id_token_hint', async () => {
    const { assign } = stubLocation('https://app.example.com/');
    stubDiscoveryFetch({
      endSessionEndpoint: `${TEST_METADATA.issuer}/protocol/openid-connect/logout`,
    });

    sessionStorage.setItem(
      'auth-orchestrator:tokens',
      JSON.stringify({
        v: 1,
        accessToken: 'access-token-value',
        idToken: 'id-token-value',
        expiresAt: Date.now() + 60_000,
      }),
    );
    const auth = new AuthOrchestrator(
      makeConfig({
        tokenStorage: 'sessionStorage',
        postLogoutRedirectUri: 'https://app.example.com/logged-out',
      }),
    );
    await auth.initialize();

    await auth.signOut();

    // Local sign-out happened first, then navigation.
    expect(auth.getState()).toEqual({ status: 'unauthenticated' });
    expect(sessionStorage.getItem('auth-orchestrator:tokens')).toBeNull();
    expect(assign).toHaveBeenCalledTimes(1);
    const url = new URL(assign.mock.calls[0]?.[0] ?? '');
    expect(url.origin + url.pathname).toBe(
      `${TEST_METADATA.issuer}/protocol/openid-connect/logout`,
    );
    expect(url.searchParams.get('id_token_hint')).toBe('id-token-value');
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(
      'https://app.example.com/logged-out',
    );
  });
});
