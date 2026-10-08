// Public API surface — keep narrow and intentional

export {
  AuthError,
  ConfigError,
  NetworkError,
  StateError,
  TokenError,
} from './errors/index';
export { AuthOrchestrator } from './orchestrator';
export { InMemoryTokenStorage } from './storage/in-memory-token-storage';
export { SessionStorageTokenStorage } from './storage/session-storage-token-storage';
export type {
  AuthConfig,
  AuthState,
  Claims,
  Provider,
  ProviderMetadata,
  TokenSet,
  TokenStorage,
  TokenStorageConfig,
  User,
} from './types';
