import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetworkError } from '../../src/errors';
import { KeycloakProvider } from '../../src/providers/keycloak';
import type { OidcDiscoveryResponse } from '../../src/types';

const discoveryDocument: OidcDiscoveryResponse = {
  authorization_endpoint: 'https://keycloak.example.com/realms/myapp/protocol/openid-connect/auth',
  token_endpoint: 'https://keycloak.example.com/realms/myapp/protocol/openid-connect/token',
  jwks_uri: 'https://keycloak.example.com/realms/myapp/protocol/openid-connect/certs',
  issuer: 'https://keycloak.example.com/realms/myapp',
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status text',
    json: async () => body,
  } as Response;
}

describe('KeycloakProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('has the keycloak id', () => {
    expect(new KeycloakProvider('https://keycloak.example.com/realms/myapp').id).toBe('keycloak');
  });

  it('discovers metadata from the realm well-known endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(discoveryDocument));
    vi.stubGlobal('fetch', fetchMock);

    const metadata = await new KeycloakProvider(
      'https://keycloak.example.com/realms/myapp',
    ).getMetadata();

    expect(metadata.issuer).toBe('https://keycloak.example.com/realms/myapp');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://keycloak.example.com/realms/myapp/.well-known/openid-configuration',
    );
  });

  it('delegates failures to the shared discovery helper', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)));

    const error = await new KeycloakProvider('https://keycloak.example.com/realms/myapp')
      .getMetadata()
      .catch((e: NetworkError) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toContain('Keycloak');
  });
});
