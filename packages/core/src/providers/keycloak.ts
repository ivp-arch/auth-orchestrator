import type { Provider, ProviderMetadata } from '../types';
import { fetchOidcDiscovery } from './discovery';

export class KeycloakProvider implements Provider {
  readonly id = 'keycloak';

  constructor(private readonly authority: string) {}

  async getMetadata(): Promise<ProviderMetadata> {
    return fetchOidcDiscovery(this.authority, 'Keycloak');
  }
}
