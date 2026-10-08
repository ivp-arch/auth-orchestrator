import type { Client } from 'oauth4webapi';
import type { AuthConfig, ProviderMetadata } from '../types';

/**
 * Thin mapping between our `ProviderMetadata` and oauth4webapi's input types.
 * All protocol work stays inside oauth4webapi — this file only adapts shapes.
 */

export function toClient(config: AuthConfig): Client {
  // Public client (Authorization Code + PKCE): no secret, no client auth method.
  return { client_id: config.clientId };
}

type AuthorizationServerInput = import('oauth4webapi').AuthorizationServer;

export function toAuthorizationServer(metadata: ProviderMetadata): AuthorizationServerInput {
  return {
    issuer: metadata.issuer,
    authorization_endpoint: metadata.authorizationEndpoint,
    token_endpoint: metadata.tokenEndpoint,
    jwks_uri: metadata.jwksUri,
    // exactOptionalPropertyTypes: only add the optional endpoint when it exists.
    ...(metadata.endSessionEndpoint !== undefined
      ? { end_session_endpoint: metadata.endSessionEndpoint }
      : {}),
  };
}
