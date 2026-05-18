/**
 * Public type surface for @auth-orchestrator/core.
 * Anything not exported from index.ts is considered internal.
 */

export type AuthConfig = {
  /** OIDC provider preset or 'generic-oidc' for custom */
  provider:
    | 'keycloak'
    | 'auth0'
    | 'okta'
    | 'google'
    | 'microsoft'
    | 'github'
    | 'apple'
    | 'generic-oidc';
  /** Issuer URL */
  authority: string;
  /** OAuth client ID */
  clientId: string;
  /** Where to redirect after auth */
  redirectUri: string;
  /** Where to redirect after logout */
  postLogoutRedirectUri?: string;
  /** OAuth scopes */
  scopes: string[];
  /** Token storage strategy */
  tokenStorage?: TokenStorageConfig;
  /** Refresh configuration */
  refresh?: RefreshConfig;
  /** Enable multi-tab synchronization */
  multiTabSync?: boolean;
};

export type TokenStorageConfig = 'memory' | 'sessionStorage' | { type: 'cookie'; backend: string };

export type RefreshConfig = {
  strategy: 'auto' | 'manual' | 'silent-iframe';
  skewSeconds?: number;
};

/**
 * Discriminated union representing the auth state machine.
 * Consumers must narrow on `status` to access state-specific fields.
 */
export type AuthState =
  | { status: 'initializing' }
  | { status: 'unauthenticated'; error?: AuthErrorLike }
  | { status: 'authenticating'; flow: 'redirect' | 'silent' | 'popup' }
  | { status: 'authenticated'; user: User; expiresAt: Date }
  | { status: 'refreshing'; user: User }
  | { status: 'error'; error: AuthErrorLike };

export type User = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  [claim: string]: unknown;
};

export type Claims = Record<string, unknown>;

export type AuthErrorLike = {
  code: string;
  message: string;
};

/**
 * Token storage abstraction. All operations are async because some backends
 * (cookie-via-BFF, IndexedDB, encrypted storage) require it.
 * For sync backends (sessionStorage) we still wrap in Promise for consistency.
 */
export interface TokenStorage {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setTokens(tokens: { accessToken: string; refreshToken?: string; expiresAt: Date }): Promise<void>;
  clear(): Promise<void>;
}

export interface Provider {
  readonly id: string;
  getMetadata(): Promise<ProviderMetadata>;
}

export type ProviderMetadata = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  endSessionEndpoint?: string;
  jwksUri: string;
  issuer: string;
};
