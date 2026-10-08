import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError, NetworkError } from '../../src/errors';
import { fetchOidcDiscovery } from '../../src/providers/discovery';
import type { OidcDiscoveryResponse } from '../../src/types';

const fullDocument: OidcDiscoveryResponse = {
  authorization_endpoint: 'https://auth.example.com/authorize',
  token_endpoint: 'https://auth.example.com/token',
  end_session_endpoint: 'https://auth.example.com/logout',
  jwks_uri: 'https://auth.example.com/.well-known/jwks.json',
  issuer: 'https://auth.example.com',
};

/** Plain-object Response stand-in; only the fields discovery reads are needed. */
function jsonResponse(
  body: unknown,
  init?: { status?: number; statusText?: string; invalidJson?: boolean },
): Response {
  const status = init?.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: init?.statusText ?? '',
    json: async () => {
      if (init?.invalidJson) {
        throw new SyntaxError('Unexpected token in JSON');
      }
      return body;
    },
  } as Response;
}

describe('fetchOidcDiscovery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps a complete discovery document to ProviderMetadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(fullDocument));
    vi.stubGlobal('fetch', fetchMock);

    const metadata = await fetchOidcDiscovery('https://auth.example.com', 'Keycloak');
    expect(metadata).toEqual({
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
      endSessionEndpoint: 'https://auth.example.com/logout',
      jwksUri: 'https://auth.example.com/.well-known/jwks.json',
      issuer: 'https://auth.example.com',
    });
  });

  it('omits endSessionEndpoint when the provider does not publish one', async () => {
    const { end_session_endpoint: _omitted, ...withoutEndSession } = fullDocument;
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(withoutEndSession));
    vi.stubGlobal('fetch', fetchMock);

    const metadata = await fetchOidcDiscovery('https://auth.example.com', 'OIDC');
    expect('endSessionEndpoint' in metadata).toBe(false);
  });

  it('strips trailing slashes from the authority', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(fullDocument));
    vi.stubGlobal('fetch', fetchMock);

    await fetchOidcDiscovery('https://auth.example.com/', 'OIDC');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://auth.example.com/.well-known/openid-configuration',
    );
  });

  it('rejects with NetworkError on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({}, { status: 404, statusText: 'Not Found' })),
    );

    const error = await fetchOidcDiscovery('https://auth.example.com', 'Keycloak').catch(
      (e: NetworkError) => e,
    );
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.code).toBe('ERR_NETWORK');
    expect(error.message).toContain('404');
  });

  it('wraps a failing fetch in a NetworkError with the original cause', async () => {
    const original = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(original));

    const error = await fetchOidcDiscovery('https://auth.example.com', 'Keycloak').catch(
      (e: NetworkError) => e,
    );
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.code).toBe('ERR_NETWORK');
    expect(error.cause).toBe(original);
  });

  it('rejects with NetworkError when the document is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(undefined, { invalidJson: true })),
    );

    const error = await fetchOidcDiscovery('https://auth.example.com', 'OIDC').catch(
      (e: NetworkError) => e,
    );
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.code).toBe('ERR_NETWORK');
  });

  it.each([
    'authorization_endpoint',
    'token_endpoint',
    'jwks_uri',
    'issuer',
  ] as const)('rejects with ConfigError when %s is missing', async (missingField) => {
    const incomplete = { ...fullDocument, [missingField]: undefined };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(incomplete)));

    const error = await fetchOidcDiscovery('https://auth.example.com', 'Keycloak').catch(
      (e: ConfigError) => e,
    );
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.code).toBe('ERR_CONFIG');
    expect(error.message).toContain('missing required endpoints');
  });
});
