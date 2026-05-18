// Public API surface — keep narrow and intentional

export {
  AuthError,
  ConfigError,
  NetworkError,
  StateError,
  TokenError,
} from './errors/index';
export { AuthOrchestrator } from './orchestrator';
export type {
  AuthConfig,
  AuthState,
  Claims,
  Provider,
  TokenStorage,
  User,
} from './types';
