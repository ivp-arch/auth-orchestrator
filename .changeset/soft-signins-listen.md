---
'@auth-orchestrator/core': minor
---

Authorization Code + PKCE (S256) sign-in and sign-out:

- **Added:** `AuthOrchestrator.initialize()` — idempotent (memoized promise) and never-rejecting startup: completes a pending provider callback, otherwise settles to `unauthenticated`; adapters will call it in their setup.
- **Added:** `signIn()` and `signOut()` are implemented (previously `ERR_NOT_IMPLEMENTED`). `signIn()` redirects via the provider's authorization endpoint with PKCE S256, `state` and `nonce`; `signOut()` clears tokens and flow state locally before optionally redirecting to `end_session_endpoint` with `id_token_hint` and `post_logout_redirect_uri`.
- **Added export** (explicit API decision): `FlowError`; `StateError` gains an optional `code` (default `ERR_STATE`).
- **Added error codes:** `ERR_FLOW`, `ERR_AUTH_RESPONSE`, `ERR_STATE_MISMATCH`, `ERR_FLOW_STATE`, `ERR_CODE_EXCHANGE`, `ERR_ID_TOKEN_INVALID`, `ERR_TOKEN_NO_EXPIRY`.
- **Behavior notes:** the `openid` scope is forced into every authorization request (`requireIdToken`); the ID token is fully validated (signature via the provider's JWKS, plus `iss`/`aud`/`exp`/`nonce`); a missing `expires_in` hard-fails with `ERR_TOKEN_NO_EXPIRY`; pending-flow state lives in `sessionStorage` under `auth-orchestrator:flow` with a 10-minute TTL and is consumed on callback completion.
- **Internal:** flow implementation in `src/flows/` on top of `oauth4webapi`; ID token signature validation via `validateApplicationLevelSignature`; URL cleanup of OAuth response parameters via `history.replaceState`.