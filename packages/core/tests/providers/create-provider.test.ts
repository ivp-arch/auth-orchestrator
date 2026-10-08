import { describe, expect, it } from 'vitest';
import { ConfigError } from '../../src/errors';
import { createProvider } from '../../src/providers/create-provider';
import { GenericOidcProvider } from '../../src/providers/generic-oidc';
import { KeycloakProvider } from '../../src/providers/keycloak';
import type { AuthConfig } from '../../src/types';

function makeConfig(overrides?: Partial<AuthConfig>): AuthConfig {
  return {
    provider: 'keycloak',
    authority: 'https://auth.example.com',
    clientId: 'frontend-app',
    redirectUri: 'https://app.example.com/auth/callback',
    scopes: ['openid'],
    ...overrides,
  };
}

describe('createProvider', () => {
  it('creates the Keycloak provider from its preset', () => {
    expect(createProvider(makeConfig({ provider: 'keycloak' }))).toBeInstanceOf(KeycloakProvider);
  });

  it('creates the generic OIDC provider from its preset', () => {
    expect(createProvider(makeConfig({ provider: 'generic-oidc' }))).toBeInstanceOf(
      GenericOidcProvider,
    );
  });

  it.each([
    'auth0',
    'okta',
    'google',
    'microsoft',
    'github',
    'apple',
  ] as const)('throws ConfigError for the unimplemented "%s" preset', (provider) => {
    expect.hasAssertions();
    try {
      createProvider(makeConfig({ provider }));
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).code).toBe('ERR_CONFIG');
      expect((error as ConfigError).message).toContain(provider);
    }
  });

  it('throws ConfigError when the authority is not a URL', () => {
    expect.hasAssertions();
    try {
      createProvider(makeConfig({ authority: 'auth.example.com' }));
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).code).toBe('ERR_CONFIG');
    }
  });

  it('throws ConfigError when the authority is not http(s)', () => {
    expect.hasAssertions();
    try {
      createProvider(makeConfig({ authority: 'ftp://auth.example.com' }));
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).code).toBe('ERR_CONFIG');
    }
  });
});
