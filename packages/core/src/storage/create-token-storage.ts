import { ConfigError } from '../errors';
import type { TokenStorage, TokenStorageConfig } from '../types';
import { InMemoryTokenStorage } from './in-memory-token-storage';
import { SessionStorageTokenStorage } from './session-storage-token-storage';

/**
 * Resolves the consumer's `tokenStorage` config into a `TokenStorage` instance.
 * The in-memory backend is the default; a custom `TokenStorage` is passed through
 * untouched so consumers can plug in IndexedDB, encrypted or BFF backends.
 */
export function createTokenStorage(config: TokenStorageConfig | undefined): TokenStorage {
  if (config === undefined || config === 'memory') {
    return new InMemoryTokenStorage();
  }
  if (config === 'sessionStorage') {
    return new SessionStorageTokenStorage();
  }
  if (typeof config === 'object' && 'getTokens' in config) {
    return config;
  }
  throw new ConfigError(
    'Cookie/BFF token storage is not implemented yet — use "memory" (default), "sessionStorage" or a custom TokenStorage implementation.',
  );
}
