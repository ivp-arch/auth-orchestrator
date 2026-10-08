---
title: Sign-in and sign-out
description: The Authorization Code + PKCE redirect flow — what initialize() does, how the callback is completed, and how sign-out works.
---

Auth Orchestrator signs users in with the OAuth 2.0 Authorization Code flow and PKCE (S256) —
the only browser flow it will ever support. No implicit flow, no password grant. Protocol and
crypto work is delegated to [`oauth4webapi`](https://github.com/panva/oauth4webapi) and
[`jose`](https://github.com/panva/jose).

```ts
import { AuthOrchestrator, type AuthConfig } from '@auth-orchestrator/core';

const config: AuthConfig = {
  provider: 'keycloak',
  authority: 'https://keycloak.example.com/realms/myapp',
  clientId: 'frontend-app',
  redirectUri: `${window.location.origin}/auth/callback`,
  scopes: ['openid', 'profile'],
};

const auth = new AuthOrchestrator(config);
```

## The flow, end to end

1. **`await auth.initialize()`** — once, at app startup. If the provider just redirected back with
   an authorization code, the code is exchanged for tokens and the session is restored; otherwise
   the state settles to `unauthenticated`.
2. **`await auth.signIn()`** — from your login button. The browser is redirected to the provider's
   authorization endpoint with PKCE, `state` and `nonce` parameters.
3. The provider authenticates the user and redirects back to your `redirectUri` with a
   one-time `code`. The page fully reloads — that is how the redirect flow works.
4. **`await auth.initialize()`** again on the freshly loaded page: it detects the callback,
   validates the response, exchanges the code, and moves the state to `authenticated`.

You never write a callback route or parse the URL yourself — `initialize()` does it, then cleans
the OAuth response parameters out of the address bar with `history.replaceState`.

### The initialize() contract

- **Idempotent.** Concurrent and repeated calls share one initialization; subscribe exactly once
  to the state, no matter how often it is called. This makes it safe for React StrictMode and
  Angular repeated injection.
- **Never rejects.** A failed initialization (bad callback, network down) settles the state to
  `unauthenticated` with an `error` object you can inspect, and the promise still resolves.
  Rejection semantics stay on `signIn()` / `signOut()`, where a `try/catch` belongs.

```ts
auth.subscribe((state) => {
  switch (state.status) {
    case 'authenticated':
      // state.user, state.expiresAt
      break;
    case 'unauthenticated':
      // state.error?.code — for example 'ERR_FLOW_STATE' after a stale callback
      break;
    case 'authenticating':
      // state.flow === 'redirect' — the browser is about to leave
      break;
    // 'initializing', 'refreshing', 'error'
  }
});

await auth.initialize();
```

### signIn()

Redirects to the provider. If the user is already authenticated it resolves without doing
anything; if a sign-in is already in flight it rejects with a `StateError`. If anything fails
before the redirect (for example discovery cannot be fetched), it rejects with a typed error —
`NetworkError`, `ConfigError` — and the flow state is cleaned up.

The `openid` scope is always requested: the library requires an ID token (it is the only
artifact it fully validates: signature via the provider's JWKS, plus `iss`, `aud`, `exp` and
`nonce`). If `openid` is missing from your `scopes`, it is added.

## Flow state and the sessionStorage key

Between the redirect and the callback, the library keeps a small `auth-orchestrator:flow` entry
in `sessionStorage`: the PKCE code verifier, the `state` and `nonce` values, and a timestamp.

**Why `sessionStorage` and not memory:** the redirect performs a full page load. An in-memory
verifier would be gone when the callback page boots, and the code could not be exchanged.

**XSS trade-off:** anything in `sessionStorage` is readable by any script running in your page.
The verifier and nonce are secrets of *your pending sign-in only* — knowing them does not grant
access to existing sessions or tokens — and the entry is removed as soon as the callback
completes (success or failure) or after **10 minutes**, whichever comes first. In-memory token
storage (the default) keeps the tokens themselves out of reach.

If the callback arrives with no flow entry (cleared storage, user took longer than 10 minutes,
or the page was opened from a bookmark), `initialize()` settles to `unauthenticated` with
`error.code === 'ERR_FLOW_STATE'` — trigger a fresh `signIn()` when you see it.

## Token lifetime

The library hard-fails with `ERR_TOKEN_NO_EXPIRY` when the token endpoint returns no usable
`expires_in`. Silent defaults hide misconfigured providers and produce sessions that never
expire, so there is none: a provider that does not return an access-token lifetime is a
configuration error you should see immediately.

## signOut()

```ts
await auth.signOut();
```

Local first, remote second:

1. Tokens and any leftover flow state are cleared, and the state moves to `unauthenticated`
   **before** any navigation — if the provider is unreachable, your users are still signed out.
2. If discovery exposes an `end_session_endpoint`, the browser is redirected to it with
   `post_logout_redirect_uri` (from your config, if set) and an `id_token_hint` when an ID token
   is available.

**`id_token_hint` trade-off:** the ID token travels as a query parameter to the endpoint that
issued it. That is what the OIDC spec prescribes for RP-initiated logout, and it lets the
provider skip a "do you really want to log out?" screen, but be aware the token ends up in the
provider's logs and your browser history. Without a stored ID token (the default in-memory
storage loses it on reload), the logout proceeds without the hint and some providers will show
a confirmation page.

If discovery itself fails, `signOut()` rejects with a `NetworkError` even though the local
sign-out already happened.

## Where the user comes from

The `state.user` object is built from the validated ID token claims only — `sub`, and when
present, `name`, `email` and `picture`, plus any other claim the provider includes. No userinfo
endpoint is called (planned for a later release), and nothing is read from the access token.

Every error mentioned on this page has an entry in the
[error codes reference](../troubleshooting/error-codes.md).