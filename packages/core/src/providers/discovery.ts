import { ConfigError, NetworkError } from '../errors';
import type { OidcDiscoveryResponse, ProviderMetadata } from '../types';

/**
 * Shared OIDC discovery for all providers (Keycloak and generic OIDC use the same
 * `/.well-known/openid-configuration` document). Failures are typed errors:
 * network failures reject with `NetworkError`, incomplete or invalid documents
 * with `ConfigError`. Required endpoints are never silently defaulted.
 */
export async function fetchOidcDiscovery(
  authority: string,
  providerLabel: string,
): Promise<ProviderMetadata> {
  const normalizedAuthority = authority.replace(/\/+$/, '');
  const url = `${normalizedAuthority}/.well-known/openid-configuration`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new NetworkError(`Failed to fetch ${providerLabel} metadata: network request failed`, {
      cause,
    });
  }
  if (!response.ok) {
    throw new NetworkError(
      `Failed to fetch ${providerLabel} metadata: ${response.status} ${response.statusText}`,
    );
  }

  let data: OidcDiscoveryResponse;
  try {
    data = (await response.json()) as OidcDiscoveryResponse;
  } catch (cause) {
    throw new NetworkError(
      `Failed to fetch ${providerLabel} metadata: discovery document is not valid JSON`,
      { cause },
    );
  }

  const { authorization_endpoint, token_endpoint, jwks_uri, issuer } = data;
  if (!authorization_endpoint || !token_endpoint || !jwks_uri || !issuer) {
    throw new ConfigError(
      `${providerLabel} discovery document is missing required endpoints (authorization_endpoint, token_endpoint, jwks_uri, issuer).`,
    );
  }

  const metadata: ProviderMetadata = {
    authorizationEndpoint: authorization_endpoint,
    tokenEndpoint: token_endpoint,
    jwksUri: jwks_uri,
    issuer,
  };
  // exactOptionalPropertyTypes: the optional endpoint is only set when the provider publishes it.
  if (data.end_session_endpoint) {
    metadata.endSessionEndpoint = data.end_session_endpoint;
  }
  return metadata;
}
