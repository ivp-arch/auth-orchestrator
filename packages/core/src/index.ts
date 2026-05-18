// Public API surface — keep narrow and intentional

export {
  AuthError,
  ConfigError,
  NetworkError,
  StateError,
  TokenError,
} from './errors/index.js';
export { AuthOrchestrator } from './orchestrator.js';
export type {
  AuthConfig,
  AuthState,
  Claims,
  Provider,
  TokenStorage,
  User,
} from './types.js';
