---
title: Error codes
description: Every AuthError code, what it means, its typical causes, and how to fix it.
---

All failures reject with a subclass of `AuthError` — `ConfigError`, `NetworkError`, `TokenError`,
`StateError`, `FlowError` — and `error.code` is the stable, programmatic identifier.
`AuthError.toJSON()` never includes token values or other secrets, so serialized errors are safe
to log.

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

Fix: this usually indicates a programming error in the calling order (for example, calling
`signIn()` while a sign-in is already in flight). Follow the guides rather than calling internal
operations directly.

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
this pre-alpha release (for example token refresh before it ships).

Fix: track the feature in the project [status table](https://github.com/ivp-arch/auth-orchestrator#status);
do not call these operations yet.

## ERR_FLOW

**Thrown by:** `FlowError` — an authorization flow failed in a way that does not have a more
specific code.

Fix: inspect `error.cause` (also available via `AuthError.toJSON()`) for the underlying
`oauth4webapi` error; the sign-in [guide](../guides/sign-in.md) explains the flow in detail.

## ERR_AUTH_RESPONSE

**Thrown by:** `FlowError` — the provider redirected back with an OAuth `error` response instead
of an authorization code.

Typical causes: the user denied consent (`access_denied`), the provider rejected the client
configuration, or the requested scopes/redirect URI are not registered for the client.

Fix: read the `error` and `error_description` query parameters (before the URL is cleaned) and fix
the provider-side configuration. An `access_denied` is the user changing their mind — treat it as
a quiet return to the unauthenticated state, not as a bug.

## ERR_STATE_MISMATCH

**Thrown by:** `StateError` — the `state` in the callback does not match the one issued at
sign-in.

Typical causes: the callback URL was opened from a bookmark, in another tab, or after the flow
state was lost; a stale page redirecting with an old `state`.

Fix: always reach the provider through `signIn()` and complete the callback in the same tab. If
it recurs, check that nothing else (a service worker, an aggressive router) rewrites the redirect
URL.

## ERR_FLOW_STATE

**Thrown by:** `StateError` — a callback arrived, but no (or an expired/corrupted) pending sign-in
exists under `auth-orchestrator:flow`.

Typical causes: the user spent more than the 10-minute TTL on the provider's login page, the
tab's `sessionStorage` was cleared, or the callback URL was reloaded a second time (the flow entry
is consumed on first use).

Fix: trigger a fresh `signIn()`. When `initialize()` surfaces this code in the state, that is the
expected recovery path — see the sign-in [guide](../guides/sign-in.md).

## ERR_CODE_EXCHANGE

**Thrown by:** `FlowError` — the token endpoint rejected the authorization code.

Typical causes: the code was already used (page reloaded mid-exchange), expired, the
`redirect_uri` or PKCE verifier does not match the original request, or the client is
misconfigured at the provider.

Fix: do not retry the exchange; start a new sign-in. If it persists, verify the `redirect_uri`
registered for the client matches `AuthConfig.redirectUri` exactly.

## ERR_ID_TOKEN_INVALID

**Thrown by:** `FlowError` — the ID token failed validation.

Typical causes: `nonce`, `iss` or `aud` do not match the authorization request, the token is
expired, the signature does not verify against the provider's JWKS, or the `sub` claim is
missing.

Fix: this usually means the clock is off, the provider's JWKS endpoint is stale, or a proxy is
rewriting responses. Verify the system clock, then compare the provider's discovery document
(`issuer`) with your configured `authority`. Never catch this error and continue without a user.

## ERR_TOKEN_NO_EXPIRY

**Thrown by:** `TokenError` — the token endpoint returned no usable `expires_in`, so the session
expiry cannot be computed.

Typical causes: the provider omits `expires_in`, or returns a non-positive value.

Fix: no silent default exists by design — configure the provider to return a real access-token
lifetime, or use a `generic-oidc` preset against a compliant endpoint.