import { calculatePKCECodeChallenge } from 'oauth4webapi';
import { describe, expect, it } from 'vitest';
import {
  buildAuthorizationUrl,
  createSignInFlowState,
  requestedScopes,
} from '../../src/flows/authorization-request';
import type { AuthConfig } from '../../src/types';
import { TEST_METADATA } from './helpers/idp';

const config: AuthConfig = {
  provider: 'keycloak',
  authority: 'https://auth.example.com/realms/myapp',
  clientId: 'frontend-app',
  redirectUri: 'https://app.example.com/auth/callback',
  scopes: ['profile'],
};

describe('createSignInFlowState', () => {
  it('creates a flow bound to the redirect URI with fresh timestamps', () => {
    const before = Date.now();
    const flow = createSignInFlowState('https://app.example.com/auth/callback');
    const after = Date.now();

    expect(flow.redirectUri).toBe('https://app.example.com/auth/callback');
    expect(flow.createdAt).toBeGreaterThanOrEqual(before);
    expect(flow.createdAt).toBeLessThanOrEqual(after);
    // RFC 7636: the code verifier is 43–128 characters.
    expect(flow.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(flow.state).not.toBe('');
    expect(flow.nonce).not.toBe('');
  });

  it('creates unique values across flows', () => {
    const first = createSignInFlowState(config.redirectUri);
    const second = createSignInFlowState(config.redirectUri);
    expect(first.codeVerifier).not.toBe(second.codeVerifier);
    expect(first.state).not.toBe(second.state);
    expect(first.nonce).not.toBe(second.nonce);
  });
});

describe('requestedScopes', () => {
  it('prepends openid when it is missing', () => {
    expect(requestedScopes(config)).toEqual(['openid', 'profile']);
  });

  it('keeps the scopes unchanged when openid is already present', () => {
    expect(requestedScopes({ ...config, scopes: ['openid', 'profile'] })).toEqual([
      'openid',
      'profile',
    ]);
  });
});

describe('buildAuthorizationUrl', () => {
  it('builds the full Authorization Code + PKCE S256 request', async () => {
    const flow = createSignInFlowState(config.redirectUri);
    const url = await buildAuthorizationUrl(TEST_METADATA, config, flow);

    expect(url.origin + url.pathname).toBe(TEST_METADATA.authorizationEndpoint);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('frontend-app');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/auth/callback');
    expect(url.searchParams.get('scope')).toBe('openid profile');
    expect(url.searchParams.get('state')).toBe(flow.state);
    expect(url.searchParams.get('nonce')).toBe(flow.nonce);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    // The challenge is the S256 transform of the saved verifier.
    expect(url.searchParams.get('code_challenge')).toBe(
      await calculatePKCECodeChallenge(flow.codeVerifier),
    );
  });
});
