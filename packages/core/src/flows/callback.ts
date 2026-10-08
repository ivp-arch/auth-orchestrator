import {
  AuthorizationResponseError,
  authorizationCodeGrantRequest,
  getValidatedIdTokenClaims,
  None,
  OperationProcessingError,
  processAuthorizationCodeResponse,
  ResponseBodyError,
  validateApplicationLevelSignature,
  validateAuthResponse,
} from 'oauth4webapi';
import { FlowError, NetworkError, StateError, TokenError } from '../errors';
import { computeExpiresAt } from '../tokens/expiry';
import type { AuthConfig, ProviderMetadata, TokenSet, User } from '../types';
import type { SignInFlowState } from './flow-state';
import { toAuthorizationServer, toClient } from './oauth4webapi-adapter';
import { buildUser } from './user';

/**
 * OAuth parameters the provider may append to the redirect URI. Only these are
 * removed after a callback; unrelated query parameters stay untouched.
 */
export const OAUTH_RESPONSE_PARAMS = [
  'code',
  'state',
  'error',
  'error_description',
  'error_uri',
  'iss',
  'session_state',
] as const;

/**
 * The URL is an authorization response when the provider appended `code` or
 * `error`. `state` alone is not a signal (it is also used by unrelated tooling)
 * and the path is deliberately not compared with the configured `redirectUri`:
 * reverse proxies routinely rewrite it, and the security binding comes from
 * validating `state`, not from the URL shape.
 */
export function isAuthorizationCallback(url: string): boolean {
  if (url === '') {
    return false;
  }
  const params = new URL(url).searchParams;
  return params.has('code') || params.has('error');
}

/** Strips the OAuth response parameters, keeping any unrelated ones. */
export function stripResponseParams(url: string): string {
  const parsed = new URL(url);
  for (const param of OAUTH_RESPONSE_PARAMS) {
    parsed.searchParams.delete(param);
  }
  return parsed.href;
}

export type AuthorizationCallbackInput = {
  metadata: ProviderMetadata;
  config: AuthConfig;
  /** The full document URL after the provider redirect. */
  callbackUrl: string;
  /** The in-flight flow saved before the redirect. */
  flow: SignInFlowState;
};

export type AuthorizationCallbackResult = {
  user: User;
  tokens: TokenSet;
};

/**
 * Completes the Authorization Code + PKCE redirect flow end to end:
 * validates the response (CSRF `state` binding), exchanges the code with the
 * verifier, validates the ID token (signature, `iss`, `aud`, `exp`, `nonce`)
 * and builds the user and the token set.
 *
 * Rejects with typed errors only; token values never appear in messages.
 */
export async function completeAuthorizationCallback(
  input: AuthorizationCallbackInput,
): Promise<AuthorizationCallbackResult> {
  const as = toAuthorizationServer(input.metadata);
  const client = toClient(input.config);

  let callbackParams: URLSearchParams;
  try {
    callbackParams = validateAuthResponse(as, client, new URL(input.callbackUrl), input.flow.state);
  } catch (cause) {
    if (cause instanceof AuthorizationResponseError) {
      throw new FlowError('The identity provider rejected the sign-in request.', {
        cause,
        code: 'ERR_AUTH_RESPONSE',
      });
    }
    if (cause instanceof OperationProcessingError) {
      throw new StateError('The authorization response failed the `state` check.', {
        cause,
        code: 'ERR_STATE_MISMATCH',
      });
    }
    throw new FlowError('The authorization response is invalid.', { cause });
  }

  let response: Response;
  try {
    response = await authorizationCodeGrantRequest(
      as,
      client,
      None(),
      callbackParams,
      input.flow.redirectUri,
      input.flow.codeVerifier,
    );
  } catch (cause) {
    throw new NetworkError('The token request to the identity provider failed.', { cause });
  }

  let tokenResponse: import('oauth4webapi').TokenEndpointResponse;
  try {
    tokenResponse = await processAuthorizationCodeResponse(as, client, response, {
      expectedNonce: input.flow.nonce,
      requireIdToken: true,
    });
  } catch (cause) {
    if (cause instanceof ResponseBodyError) {
      throw new FlowError('The token endpoint rejected the code exchange.', {
        cause,
        code: 'ERR_CODE_EXCHANGE',
      });
    }
    if (cause instanceof OperationProcessingError) {
      // Covers `nonce`/`iss`/`aud`/`exp` and signature failures.
      throw new FlowError('The ID token returned by the identity provider is invalid.', {
        cause,
        code: 'ERR_ID_TOKEN_INVALID',
      });
    }
    // The JWKS fetch (signature validation) runs inside the call above.
    throw new NetworkError('Fetching or validating the identity provider keys failed.', {
      cause,
    });
  }

  // Claims are validated above (iss/aud/exp/nonce by oauth4webapi). The
  // signature is verified as defense-in-depth: the token endpoint is reached
  // over TLS, but a signature check also catches misconfigured or hostile
  // token endpoints. It fetches the provider's JWKS through `as.jwks_uri`.
  try {
    await validateApplicationLevelSignature(as, response);
  } catch (cause) {
    if (cause instanceof TypeError) {
      // The JWKS fetch itself failed at network level.
      throw new NetworkError('Fetching the identity provider keys failed.', { cause });
    }
    // Invalid signature, unusable JWKS or an unsupported (e.g. symmetric) alg.
    throw new FlowError('The ID token signature is not valid for the identity provider keys.', {
      cause,
      code: 'ERR_ID_TOKEN_INVALID',
    });
  }

  const claims = getValidatedIdTokenClaims(tokenResponse);
  if (!claims) {
    throw new FlowError('The token response does not contain a validated ID token.', {
      code: 'ERR_ID_TOKEN_INVALID',
    });
  }
  const user = buildUser(claims);

  const expiresIn = tokenResponse.expires_in;
  if (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    // No silent default lifetime: an unusable `expires_in` cannot be trusted.
    throw new TokenError('The token response has no usable "expires_in" lifetime.', {
      code: 'ERR_TOKEN_NO_EXPIRY',
    });
  }

  const tokens: TokenSet = {
    accessToken: tokenResponse.access_token,
    expiresAt: computeExpiresAt(expiresIn),
  };
  if (typeof tokenResponse.refresh_token === 'string') {
    tokens.refreshToken = tokenResponse.refresh_token;
  }
  if (typeof tokenResponse.id_token === 'string') {
    tokens.idToken = tokenResponse.id_token;
  }
  return { user, tokens };
}
