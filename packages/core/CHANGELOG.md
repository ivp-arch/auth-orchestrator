# @auth-orchestrator/core

## 0.1.0-alpha.0

### Minor Changes

- [#34](https://github.com/ivp-arch/auth-orchestrator/pull/34) [`89828a9`](https://github.com/ivp-arch/auth-orchestrator/commit/89828a979a678db95e72e14896f5e868d2f4b799) Thanks [@ivp-arch](https://github.com/ivp-arch)! - Authorization Code + PKCE (S256) sign-in and sign-out:

  - **Added:** `AuthOrchestrator.initialize()` — idempotent (memoized promise) and never-rejecting startup: completes a pending provider callback, otherwise settles to `unauthenticated`; adapters will call it in their setup.
  - **Added:** `signIn()` and `signOut()` are implemented (previously `ERR_NOT_IMPLEMENTED`). `signIn()` redirects via the provider's authorization endpoint with PKCE S256, `state` and `nonce`; `signOut()` clears tokens and flow state locally before optionally redirecting to `end_session_endpoint` with `id_token_hint` and `post_logout_redirect_uri`.
  - **Added export** (explicit API decision): `FlowError`; `StateError` gains an optional `code` (default `ERR_STATE`).
  - **Added error codes:** `ERR_FLOW`, `ERR_AUTH_RESPONSE`, `ERR_STATE_MISMATCH`, `ERR_FLOW_STATE`, `ERR_CODE_EXCHANGE`, `ERR_ID_TOKEN_INVALID`, `ERR_TOKEN_NO_EXPIRY`.
  - **Behavior notes:** the `openid` scope is forced into every authorization request (`requireIdToken`); the ID token is fully validated (signature via the provider's JWKS, plus `iss`/`aud`/`exp`/`nonce`); a missing `expires_in` hard-fails with `ERR_TOKEN_NO_EXPIRY`; pending-flow state lives in `sessionStorage` under `auth-orchestrator:flow` with a 10-minute TTL and is consumed on callback completion.
  - **Internal:** flow implementation in `src/flows/` on top of `oauth4webapi`; ID token signature validation via `validateApplicationLevelSignature`; URL cleanup of OAuth response parameters via `history.replaceState`.

- [#33](https://github.com/ivp-arch/auth-orchestrator/pull/33) [`74d26c6`](https://github.com/ivp-arch/auth-orchestrator/commit/74d26c6300fcaa6104ce318eb5667cbbdb0eba66) Thanks [@ivp-arch](https://github.com/ivp-arch)! - Token layer, token storage and `getAccessToken()`:

  - **Added exports** (explicit API decisions): `InMemoryTokenStorage`, `SessionStorageTokenStorage`, and types `TokenSet`, `TokenStorageConfig`, `ProviderMetadata`.
  - **Breaking (pre-alpha):** `TokenStorage` is now a token-set interface (`getTokens` / `setTokens` / `clear`) instead of per-token getters, and `AuthConfig.tokenStorage` accepts a custom `TokenStorage` instance as well as the named backends.
  - **Added:** `AuthOrchestrator.getAccessToken()` — resolves with the current access token or rejects with a typed error.
  - **Added:** granular `TokenError` codes `ERR_TOKEN_MISSING` and `ERR_TOKEN_EXPIRED` (via an optional `code` option); existing codes are unchanged.
  - **Added:** `ERR_NOT_IMPLEMENTED` for scaffolded operations (`signIn` / `signOut` previously threw a bare `Error`).
  - **Fixed:** OIDC discovery is shared between providers and now surfaces failures as typed errors (`NetworkError` with `cause`, `ConfigError` for missing required endpoints) instead of a bare `TypeError` or silently-empty metadata; unimplemented provider presets and invalid authorities fail fast with `ConfigError` at construction.
  - **Internal:** first unit-test suite for the package; `passWithNoTests` in the shared vitest preset; vitest config for the Angular package.
