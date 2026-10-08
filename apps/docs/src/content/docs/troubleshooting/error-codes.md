---
title: Error codes
description: Every AuthError code, what it means, its typical causes, and how to fix it.
---

All failures reject with a subclass of `AuthError` — `ConfigError`, `NetworkError`, `TokenError`,
`StateError` — and `error.code` is the stable, programmatic identifier. `AuthError.toJSON()` never
includes token values or other secrets, so serialized errors are safe to log.

## ERR_CONFIG

**Thrown by:** `ConfigError` — your configuration is invalid, or the provider's discovery document
is incomplete.

Typical causes:

- `authority` is not an absolute `http(s)` URL (missing protocol, typo).
- `provider` preset is valid in the type but not implemented yet (only `keycloak` and
  `generic-oidc` exist today).
- The discovery document is missing `authorization_endpoint`, `token_endpoint`, `jwks_uri` or
  `issuer`.
- `sessionStorage` was selected but no `sessionStorage` global exists (SSR / non-browser host).

Fix: check the values you pass to `AuthOrchestrator` (or `provideAuth()` / `<AuthProvider>`); for
discovery problems, open `${authority}/.well-known/openid-configuration` and verify the required
endpoints are present.

## ERR_NETWORK

**Thrown by:** `NetworkError` — an HTTP request failed.

Typical causes: the identity provider is unreachable, a corporate proxy blocks the request, a CORS
misconfiguration on the discovery endpoint, or the response is not valid JSON.

Fix: check connectivity to the `authority` URL in the browser network tab; verify CORS headers on
the discovery document.

## ERR_STATE

**Thrown by:** `StateError` — the state machine received an operation it cannot satisfy in its
current state.

Fix: this usually indicates a programming error in the calling order (for example, operating on a
callback while no flow is in flight). Follow the guides rather than calling internal operations
directly.

## ERR_TOKEN

**Thrown by:** `TokenError` — generic token-layer failure, for example persisted token data that
is corrupted or malformed.

Fix: clear the persisted storage key (`auth-orchestrator:tokens` for the `sessionStorage`
backend) and sign in again.

## ERR_TOKEN_MISSING

**Thrown by:** `TokenError` — `getAccessToken()` found nothing in storage.

Typical causes: the user has not signed in yet, or the app reloaded and the (default) in-memory
storage is empty.

Fix: trigger a sign-in before requesting tokens.

## ERR_TOKEN_EXPIRED

**Thrown by:** `TokenError` — the stored access token is past its expiry, including the configured
refresh skew.

Fix: refresh the session (automatic refresh arrives in a later release) or sign in again.

## ERR_NOT_IMPLEMENTED

**Thrown by:** `AuthError` — you called an operation that is scaffolded but not implemented yet in
this pre-alpha release (for example `signIn()` / `signOut()` before the redirect flow ships).

Fix: track the feature in the project [status table](https://github.com/ivp-arch/auth-orchestrator#status);
do not call these operations yet.