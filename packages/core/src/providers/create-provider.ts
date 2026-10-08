import { ConfigError } from '../errors';
import type { AuthConfig, Provider } from '../types';
import { GenericOidcProvider } from './generic-oidc';
import { KeycloakProvider } from './keycloak';

/**
 * Resolves `AuthConfig.provider` into a `Provider`, failing fast in the
 * constructor on an invalid authority or an unimplemented preset.
 */
export function createProvider(config: AuthConfig): Provider {
  let authority: URL;
  try {
    authority = new URL(config.authority);
  } catch {
    throw new ConfigError(`Invalid authority: "${config.authority}" is not a valid URL.`);
  }
  if (authority.protocol !== 'http:' && authority.protocol !== 'https:') {
    throw new ConfigError(`Invalid authority: "${config.authority}" must be an http(s) URL.`);
  }

  switch (config.provider) {
    case 'keycloak':
      return new KeycloakProvider(config.authority);
    case 'generic-oidc':
      return new GenericOidcProvider(config.authority);
    default:
      throw new ConfigError(
        `Provider preset "${config.provider}" is not implemented yet — only "keycloak" and "generic-oidc" are available.`,
      );
  }
}
