import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FlowError, NetworkError, StateError, TokenError } from '../../src/errors';
import {
  completeAuthorizationCallback,
  isAuthorizationCallback,
  OAUTH_RESPONSE_PARAMS,
  stripResponseParams,
} from '../../src/flows/callback';
import type { SignInFlowState } from '../../src/flows/flow-state';
import type { AuthConfig } from '../../src/types';
import {
  CLIENT_ID,
  createIdTokenKit,
  type IdTokenKit,
  JWKS_URI,
  jsonResponse,
  REDIRECT_URI,
  stubFetch,
  TEST_METADATA,
  TOKEN_ENDPOINT,
} from './helpers/idp';

const config: AuthConfig = {
  provider: 'keycloak',
  authority: 'https://auth.example.com/realms/myapp',
  clientId: CLIENT_ID,
  redirectUri: REDIRECT_URI,
  scopes: ['openid', 'profile'],
};

function makeFlow(overrides?: Partial<SignInFlowState>): SignInFlowState {
  return {
    codeVerifier: 'v'.repeat(43),
    state: 'expected-state',
    nonce: 'expected-nonce',
    redirectUri: REDIRECT_URI,
    createdAt: Date.now(),
    ...overrides,
  };
}

function callbackUrl(query: Record<string, string>): string {
  const url = new URL(REDIRECT_URI);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.href;
}

function tokenBody(idToken: string, overrides?: Record<string, unknown>) {
  return {
    access_token: 'access-token-value',
    token_type: 'Bearer',
    expires_in: 3600,
    id_token: idToken,
    ...overrides,
  };
}

/** The full happy-path fetch stub: token endpoint + JWKS. */
function stubHappyPathFetch(idToken: string) {
  return stubFetch((url) => {
    if (url === TOKEN_ENDPOINT) {
      return jsonResponse(200, tokenBody(idToken));
    }
    if (url === JWKS_URI) {
      return jsonResponse(200, kit.jwks);
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  });
}

let kit: IdTokenKit;

describe('isAuthorizationCallback', () => {
  it('detects code and error responses', () => {
    expect(isAuthorizationCallback('https://app.example.com/cb?code=x')).toBe(true);
    expect(isAuthorizationCallback('https://app.example.com/cb?error=access_denied')).toBe(true);
  });

  it('ignores plain URLs, state-only URLs and empty URLs', () => {
    expect(isAuthorizationCallback('https://app.example.com/cb?state=x')).toBe(false);
    expect(isAuthorizationCallback('https://app.example.com/cb')).toBe(false);
    expect(isAuthorizationCallback('')).toBe(false);
  });
});

describe('stripResponseParams', () => {
  it('removes only the OAuth response parameters', () => {
    const url = 'https://app.example.com/cb?code=x&state=y&foo=bar&error=z&iss=i';
    expect(stripResponseParams(url)).toBe('https://app.example.com/cb?foo=bar');
  });

  it('is a no-op when there is nothing to strip', () => {
    expect(stripResponseParams('https://app.example.com/cb')).toBe('https://app.example.com/cb');
  });

  it('covers every response parameter the provider may append', () => {
    const url = new URL('https://app.example.com/cb');
    for (const param of OAUTH_RESPONSE_PARAMS) {
      url.searchParams.set(param, 'x');
    }
    expect(stripResponseParams(url.href)).toBe('https://app.example.com/cb');
  });
});

describe('completeAuthorizationCallback', () => {
  beforeAll(async () => {
    kit = await createIdTokenKit(TEST_METADATA.issuer, CLIENT_ID);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('completes a valid callback: user from ID-token claims, tokens stored', async () => {
    const flow = makeFlow();
    const idToken = await kit.mintIdToken({
      sub: 'user-1',
      nonce: flow.nonce,
      name: 'Test User',
      email: 'test@example.com',
    });
    stubHappyPathFetch(idToken);

    const before = Date.now();
    const result = await completeAuthorizationCallback({
      metadata: TEST_METADATA,
      config,
      callbackUrl: callbackUrl({ code: 'authz-code', state: flow.state }),
      flow,
    });

    expect(result.user.sub).toBe('user-1');
    expect(result.user.name).toBe('Test User');
    expect(result.user.email).toBe('test@example.com');
    expect(result.tokens.accessToken).toBe('access-token-value');
    expect(result.tokens.refreshToken).toBeUndefined();
    expect(result.tokens.idToken).toBe(idToken);
    expect(result.tokens.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3600_000 - 5_000);
  });

  it('keeps the refresh token when the provider issues one', async () => {
    const flow = makeFlow();
    const idToken = await kit.mintIdToken({ sub: 'user-1', nonce: flow.nonce });
    stubFetch((url) => {
      if (url === TOKEN_ENDPOINT) {
        return jsonResponse(200, tokenBody(idToken, { refresh_token: 'refresh-token-value' }));
      }
      if (url === JWKS_URI) {
        return jsonResponse(200, kit.jwks);
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    const result = await completeAuthorizationCallback({
      metadata: TEST_METADATA,
      config,
      callbackUrl: callbackUrl({ code: 'authz-code', state: flow.state }),
      flow,
    });
    expect(result.tokens.refreshToken).toBe('refresh-token-value');
  });

  it('rejects with ERR_STATE_MISMATCH when the state does not match', async () => {
    const flow = makeFlow();
    stubFetch(() => {
      throw new Error('fetch must not be reached');
    });

    const error = await completeAuthorizationCallback({
      metadata: TEST_METADATA,
      config,
      callbackUrl: callbackUrl({ code: 'authz-code', state: 'forged-state' }),
      flow,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(StateError);
    expect((error as StateError).code).toBe('ERR_STATE_MISMATCH');
  });

  it('rejects with ERR_AUTH_RESPONSE when the provider returns an error response', async () => {
    const flow = makeFlow();
    stubFetch(() => {
      throw new Error('fetch must not be reached');
    });

    const error = await completeAuthorizationCallback({
      metadata: TEST_METADATA,
      config,
      // Error responses echo the state back; only then the error is surfaced.
      callbackUrl: callbackUrl({
        error: 'access_denied',
        error_description: 'The user denied the request',
        state: flow.state,
      }),
      flow,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FlowError);
    expect((error as FlowError).code).toBe('ERR_AUTH_RESPONSE');
  });

  it('rejects with ERR_CODE_EXCHANGE when the token endpoint rejects the code', async () => {
    const flow = makeFlow();
    stubFetch((url) => {
      if (url === TOKEN_ENDPOINT) {
        return jsonResponse(400, { error: 'invalid_grant' });
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    const error = await completeAuthorizationCallback({
      metadata: TEST_METADATA,
      config,
      callbackUrl: callbackUrl({ code: 'authz-code', state: flow.state }),
      flow,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FlowError);
    expect((error as FlowError).code).toBe('ERR_CODE_EXCHANGE');
  });

  it('rejects with ERR_ID_TOKEN_INVALID when the nonce does not match', async () => {
    const flow = makeFlow();
    const idToken = await kit.mintIdToken({ sub: 'user-1', nonce: 'other-nonce' });
    stubHappyPathFetch(idToken);

    const error = await completeAuthorizationCallback({
      metadata: TEST_METADATA,
      config,
      callbackUrl: callbackUrl({ code: 'authz-code', state: flow.state }),
      flow,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FlowError);
    expect((error as FlowError).code).toBe('ERR_ID_TOKEN_INVALID');
  });

  it('rejects with ERR_ID_TOKEN_INVALID when the issuer does not match', async () => {
    const flow = makeFlow();
    const idToken = await kit.mintIdToken({ sub: 'user-1', nonce: flow.nonce });
    const otherIssuer = await createIdTokenKit('https://evil.example.com', CLIENT_ID);
    stubFetch((url) => {
      if (url === TOKEN_ENDPOINT) {
        return jsonResponse(200, tokenBody(idToken));
      }
      if (url === JWKS_URI) {
        return jsonResponse(200, otherIssuer.jwks);
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    const error = await completeAuthorizationCallback({
      metadata: TEST_METADATA,
      config,
      callbackUrl: callbackUrl({ code: 'authz-code', state: flow.state }),
      flow,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FlowError);
    expect((error as FlowError).code).toBe('ERR_ID_TOKEN_INVALID');
  });

  it('rejects with ERR_ID_TOKEN_INVALID when the ID token is expired', async () => {
    const flow = makeFlow();
    const idToken = await kit.mintIdToken({ sub: 'user-1', nonce: flow.nonce }, '-1h');
    stubHappyPathFetch(idToken);

    const error = await completeAuthorizationCallback({
      metadata: TEST_METADATA,
      config,
      callbackUrl: callbackUrl({ code: 'authz-code', state: flow.state }),
      flow,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FlowError);
    expect((error as FlowError).code).toBe('ERR_ID_TOKEN_INVALID');
  });

  it('rejects with ERR_TOKEN_NO_EXPIRY when expires_in is missing', async () => {
    const flow = makeFlow();
    const idToken = await kit.mintIdToken({ sub: 'user-1', nonce: flow.nonce });
    stubFetch((url) => {
      if (url === TOKEN_ENDPOINT) {
        return jsonResponse(200, tokenBody(idToken, { expires_in: undefined }));
      }
      if (url === JWKS_URI) {
        return jsonResponse(200, kit.jwks);
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    const error = await completeAuthorizationCallback({
      metadata: TEST_METADATA,
      config,
      callbackUrl: callbackUrl({ code: 'authz-code', state: flow.state }),
      flow,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TokenError);
    expect((error as TokenError).code).toBe('ERR_TOKEN_NO_EXPIRY');
  });

  it('rejects with ERR_NETWORK when the token request fails at network level', async () => {
    const flow = makeFlow();
    stubFetch((url) => {
      if (url === TOKEN_ENDPOINT) {
        throw new TypeError('network is down');
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    const error = await completeAuthorizationCallback({
      metadata: TEST_METADATA,
      config,
      callbackUrl: callbackUrl({ code: 'authz-code', state: flow.state }),
      flow,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).code).toBe('ERR_NETWORK');
  });

  it('never puts token or code values into error messages', async () => {
    const flow = makeFlow();
    stubFetch((url) => {
      if (url === TOKEN_ENDPOINT) {
        return jsonResponse(400, { error: 'invalid_grant' });
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    const error = await completeAuthorizationCallback({
      metadata: TEST_METADATA,
      config,
      callbackUrl: callbackUrl({ code: 'super-secret-code', state: flow.state }),
      flow,
    }).catch((e: unknown) => e);

    expect(JSON.stringify(error)).not.toContain('super-secret-code');
  });
});
