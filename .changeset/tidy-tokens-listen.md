---
'@auth-orchestrator/core': minor
---

Token layer, token storage and `getAccessToken()`:

- **Added exports** (explicit API decisions): `InMemoryTokenStorage`, `SessionStorageTokenStorage`, and types `TokenSet`, `TokenStorageConfig`, `ProviderMetadata`.
- **Breaking (pre-alpha):** `TokenStorage` is now a token-set interface (`getTokens` / `setTokens` / `clear`) instead of per-token getters, and `AuthConfig.tokenStorage` accepts a custom `TokenStorage` instance as well as the named backends.
- **Added:** `AuthOrchestrator.getAccessToken()` — resolves with the current access token or rejects with a typed error.
- **Added:** granular `TokenError` codes `ERR_TOKEN_MISSING` and `ERR_TOKEN_EXPIRED` (via an optional `code` option); existing codes are unchanged.
- **Added:** `ERR_NOT_IMPLEMENTED` for scaffolded operations (`signIn` / `signOut` previously threw a bare `Error`).
- **Fixed:** OIDC discovery is shared between providers and now surfaces failures as typed errors (`NetworkError` with `cause`, `ConfigError` for missing required endpoints) instead of a bare `TypeError` or silently-empty metadata; unimplemented provider presets and invalid authorities fail fast with `ConfigError` at construction.
- **Internal:** first unit-test suite for the package; `passWithNoTests` in the shared vitest preset; vitest config for the Angular package.