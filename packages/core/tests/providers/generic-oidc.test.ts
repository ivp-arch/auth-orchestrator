import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetworkError } from '../../src/errors';
import { GenericOidcProvider } from '../../src/providers/generic-oidc';
import type { OidcDiscoveryResponse } from '../../src/types';

const discoveryDocument: OidcDiscoveryResponse = {
  authorization_endpoint: 'https://auth.example.com/authorize',
  token_endpoint: 'https://auth.example.com/token',
  jwks_uri: 'https://auth.example.com/jwks',
  issuer: 'https://auth.example.com',
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status text',
    json: async () => body,
  } as Response;
}

describe('GenericOidcProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('has the generic-oidc id', () => {
    expect(new GenericOidcProvider('https://auth.example.com').id).toBe('generic-oidc');
  });

  it('discovers metadata from the well-known endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(discoveryDocument));
    vi.stubGlobal('fetch', fetchMock);

    const metadata = await new GenericOidcProvider('https://auth.example.com').getMetadata();

    expect(metadata.authorizationEndpoint).toBe('https://auth.example.com/authorize');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://auth.example.com/.well-known/openid-configuration',
    );
  });

  it('delegates failures to the shared discovery helper', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)));

    const error = await new GenericOidcProvider('https://auth.example.com')
      .getMetadata()
      .catch((e: NetworkError) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toContain('OIDC');
  });
});
