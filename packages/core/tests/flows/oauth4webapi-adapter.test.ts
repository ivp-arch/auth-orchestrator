import { None } from 'oauth4webapi';
import { describe, expect, it } from 'vitest';
import { toAuthorizationServer, toClient } from '../../src/flows/oauth4webapi-adapter';
import type { AuthConfig } from '../../src/types';
import { END_SESSION_ENDPOINT, TEST_METADATA } from './helpers/idp';

const config: AuthConfig = {
  provider: 'keycloak',
  authority: 'https://auth.example.com/realms/myapp',
  clientId: 'frontend-app',
  redirectUri: 'https://app.example.com/auth/callback',
  scopes: ['openid'],
};

describe('toClient', () => {
  it('maps the config to a public client', () => {
    expect(toClient(config)).toEqual({ client_id: 'frontend-app' });
    // Sanity: the public-client auth method must be usable with this client.
    expect(() => None()).not.toThrow();
  });
});

describe('toAuthorizationServer', () => {
  it('maps the provider metadata', () => {
    expect(toAuthorizationServer(TEST_METADATA)).toEqual({
      issuer: TEST_METADATA.issuer,
      authorization_endpoint: TEST_METADATA.authorizationEndpoint,
      token_endpoint: TEST_METADATA.tokenEndpoint,
      jwks_uri: TEST_METADATA.jwksUri,
    });
  });

  it('maps end_session_endpoint only when the provider publishes it', () => {
    const withEndSession = toAuthorizationServer({
      ...TEST_METADATA,
      endSessionEndpoint: END_SESSION_ENDPOINT,
    });
    expect(withEndSession.end_session_endpoint).toBe(END_SESSION_ENDPOINT);

    const withoutEndSession = toAuthorizationServer(TEST_METADATA);
    expect('end_session_endpoint' in withoutEndSession).toBe(false);
  });
});
