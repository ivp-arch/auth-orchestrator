import { NetworkError } from '../errors';
import type { Provider, ProviderMetadata } from '../types';

export class GenericOidcProvider implements Provider {
  readonly id = 'generic-oidc';

  constructor(private readonly authority: string) {}

  async getMetadata(): Promise<ProviderMetadata> {
    const url = `${this.authority}/.well-known/openid-configuration`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new NetworkError(`Failed to fetch OIDC metadata: ${response.statusText}`);
    }
    const data = (await response.json()) as Record<string, string>;

    return {
      authorizationEndpoint: data['authorization_endpoint'] ?? '',
      tokenEndpoint: data['token_endpoint'] ?? '',
      endSessionEndpoint: data['end_session_endpoint'] ?? '',
      jwksUri: data['jwks_uri'] ?? '',
      issuer: data['issuer'] ?? '',
    };
  }
}
