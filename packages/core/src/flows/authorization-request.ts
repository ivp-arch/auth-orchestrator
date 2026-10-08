import {
  calculatePKCECodeChallenge,
  generateRandomCodeVerifier,
  generateRandomNonce,
  generateRandomState,
} from 'oauth4webapi';
import type { AuthConfig, ProviderMetadata } from '../types';
import type { SignInFlowState } from './flow-state';

/**
 * Authorization request side of the redirect flow. oauth4webapi 3.x has no
 * authorization-URL builder, so the URL is assembled here from the standard
 * Authorization Code + PKCE (S256) parameters. Random values come from
 * oauth4webapi (which uses `crypto.getRandomValues` under the hood) — never
 * hand-rolled.
 */

export function createSignInFlowState(redirectUri: string): SignInFlowState {
  return {
    codeVerifier: generateRandomCodeVerifier(),
    state: generateRandomState(),
    nonce: generateRandomNonce(),
    redirectUri,
    createdAt: Date.now(),
  };
}

/**
 * `openid` is required for an ID token (the user profile comes from its claims),
 * so it is forced into the request regardless of the configured scopes.
 */
export function requestedScopes(config: AuthConfig): string[] {
  return config.scopes.includes('openid') ? config.scopes : ['openid', ...config.scopes];
}

export async function buildAuthorizationUrl(
  metadata: ProviderMetadata,
  config: AuthConfig,
  flow: SignInFlowState,
): Promise<URL> {
  const url = new URL(metadata.authorizationEndpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', flow.redirectUri);
  url.searchParams.set('scope', requestedScopes(config).join(' '));
  url.searchParams.set('state', flow.state);
  url.searchParams.set('nonce', flow.nonce);
  // S256 only — `plain` is forbidden by RFC 9700 for browser-based apps.
  url.searchParams.set('code_challenge', await calculatePKCECodeChallenge(flow.codeVerifier));
  url.searchParams.set('code_challenge_method', 'S256');
  return url;
}
