import type { Provider, ProviderMetadata } from '../types';
import { fetchOidcDiscovery } from './discovery';

export class GenericOidcProvider implements Provider {
  readonly id = 'generic-oidc';

  constructor(private readonly authority: string) {}

  async getMetadata(): Promise<ProviderMetadata> {
    return fetchOidcDiscovery(this.authority, 'OIDC');
  }
}
