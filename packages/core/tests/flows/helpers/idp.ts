import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { vi } from 'vitest';
import type { OidcDiscoveryResponse, ProviderMetadata } from '../../../src/types';

/**
 * Test doubles for the identity provider. ID tokens are *real* RS256 JWTs
 * minted with jose, because oauth4webapi verifies their signature against a
 * JWKS fetched through the global `fetch` — a hand-written fake token would be
 * rejected before any of our assertions run.
 */

export const ISSUER = 'https://auth.example.com/realms/myapp';
export const CLIENT_ID = 'frontend-app';
export const REDIRECT_URI = 'https://app.example.com/auth/callback';

export const TOKEN_ENDPOINT = `${ISSUER}/protocol/openid-connect/token`;
export const JWKS_URI = `${ISSUER}/protocol/openid-connect/certs`;
export const AUTHORIZATION_ENDPOINT = `${ISSUER}/protocol/openid-connect/auth`;
export const END_SESSION_ENDPOINT = `${ISSUER}/protocol/openid-connect/logout`;
export const DISCOVERY_URL = `${ISSUER}/.well-known/openid-configuration`;

export const TEST_METADATA: ProviderMetadata = {
  issuer: ISSUER,
  authorizationEndpoint: AUTHORIZATION_ENDPOINT,
  tokenEndpoint: TOKEN_ENDPOINT,
  jwksUri: JWKS_URI,
};

export function discoveryDocument(metadata: ProviderMetadata): OidcDiscoveryResponse {
  return {
    issuer: metadata.issuer,
    authorization_endpoint: metadata.authorizationEndpoint,
    token_endpoint: metadata.tokenEndpoint,
    jwks_uri: metadata.jwksUri,
    ...(metadata.endSessionEndpoint !== undefined
      ? { end_session_endpoint: metadata.endSessionEndpoint }
      : {}),
  };
}

export type IdTokenKit = {
  /** Mints a signed ID token. `aud`/`iss` are baked in; pass `sub`, `nonce`, … */
  mintIdToken: (claims: Record<string, unknown>, expiresIn?: string) => Promise<string>;
  jwks: Record<string, unknown>;
};

export async function createIdTokenKit(issuer: string, audience: string): Promise<IdTokenKit> {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const jwk = await exportJWK(publicKey);

  return {
    async mintIdToken(claims, expiresIn = '2h') {
      return await new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(privateKey);
    },
    jwks: { keys: [jwk] },
  };
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

/** Replaces the global `fetch` with a URL-dispatching mock and returns it. */
export function stubFetch(handler: FetchHandler) {
  const mock = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = input instanceof URL ? input.href : String(input);
    return await handler(url, init);
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

/** Replaces the navigation globals (`location`, `history`) with spies. */
export function stubLocation(href: string) {
  const assign = vi.fn();
  const replaceState = vi.fn();
  vi.stubGlobal('location', { href, assign });
  vi.stubGlobal('history', { replaceState, state: null });
  return { assign, replaceState };
}
