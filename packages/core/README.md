# @auth-orchestrator/core

Framework-agnostic OAuth 2.0 / OpenID Connect engine for single-page applications. It powers
the Angular and React adapters of [Auth Orchestrator](https://github.com/ivp-arch/auth-orchestrator).

> [!WARNING]
> **Pre-alpha.** Most features are not implemented yet and the API will change. Do not use in
> production. See the [project status](https://github.com/ivp-arch/auth-orchestrator#status).

## Which package do I need?

Building an app? Install an adapter instead — it brings the core with it:

- [`@auth-orchestrator/angular`](https://www.npmjs.com/package/@auth-orchestrator/angular)
- [`@auth-orchestrator/react`](https://www.npmjs.com/package/@auth-orchestrator/react)

Use the core directly only for another framework, vanilla TypeScript, or to build your own
adapter.

## Installation

```bash
pnpm add @auth-orchestrator/core
```

## Target API

```ts
import { AuthOrchestrator, type AuthConfig } from '@auth-orchestrator/core';

const config: AuthConfig = {
  provider: 'keycloak', // or 'generic-oidc' for any OIDC-compliant provider
  authority: 'https://keycloak.example.com/realms/myapp',
  clientId: 'frontend-app',
  redirectUri: `${window.location.origin}/auth/callback`,
  scopes: ['openid', 'profile', 'email'],
};

const auth = new AuthOrchestrator(config);

// Boot the state machine once at startup (idempotent, never rejects):
// completes a pending callback if the provider redirected back,
// otherwise settles to `unauthenticated`.
await auth.initialize();

// Reactive state: a discriminated union on `status`
const unsubscribe = auth.subscribe((state) => {
  if (state.status === 'authenticated') {
    console.log('Signed in as', state.user.sub);
  }
});

// One-shot operations return Promises
await auth.signIn(); // redirect to the provider (Authorization Code + PKCE S256)
await auth.signOut(); // local clear, then the provider's end-session endpoint if any
```

### State model

`getState()` and `subscribe()` expose an `AuthState`:

| `status` | Extra fields |
| --- | --- |
| `initializing` | — |
| `unauthenticated` | `error?` |
| `authenticating` | `flow: 'redirect' \| 'silent' \| 'popup'` |
| `authenticated` | `user`, `expiresAt` |
| `refreshing` | `user` |
| `error` | `error` |

### Token storage

Tokens are kept **in memory by default**: nothing is written to `sessionStorage`, `localStorage`
or cookies. Opt into `sessionStorage` or plug in a custom backend via `tokenStorage`:

```ts
import { SessionStorageTokenStorage, type AuthConfig } from '@auth-orchestrator/core';

const config: AuthConfig = {
  // …
  tokenStorage: 'sessionStorage', // or 'memory' (default), a TokenStorage instance, …
};
```

`getAccessToken()` returns the current access token or rejects with a typed `TokenError`
(`ERR_TOKEN_MISSING` / `ERR_TOKEN_EXPIRED`). See the
[token storage guide](https://github.com/ivp-arch/auth-orchestrator/tree/main/apps/docs/src/content/docs/guides/token-storage.md)
for the `sessionStorage` XSS trade-off and custom backends.

### Errors

Failures reject with subclasses of `AuthError` — `ConfigError`, `NetworkError`, `TokenError`,
`StateError`, `FlowError` — each with a stable `code`. `AuthError.toJSON()` never includes
sensitive data, so errors are safe to send to logging tools. Every code is documented in the
[error codes reference](https://github.com/ivp-arch/auth-orchestrator/tree/main/apps/docs/src/content/docs/troubleshooting/error-codes.md);
the sign-in flow codes are covered in the
[sign-in guide](https://github.com/ivp-arch/auth-orchestrator/tree/main/apps/docs/src/content/docs/guides/sign-in.md).

## License

[MIT](https://github.com/ivp-arch/auth-orchestrator/blob/main/LICENSE)
