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

// Reactive state: a discriminated union on `status`
const unsubscribe = auth.subscribe((state) => {
  if (state.status === 'authenticated') {
    console.log('Signed in as', state.user.sub);
  }
});

// One-shot operations return Promises
await auth.signIn(); // not implemented yet
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

### Errors

Failures reject with subclasses of `AuthError` — `ConfigError`, `NetworkError`, `TokenError`,
`StateError` — each with a stable `code`. `AuthError.toJSON()` never includes sensitive data, so
errors are safe to send to logging tools.

## License

[MIT](https://github.com/ivp-arch/auth-orchestrator/blob/main/LICENSE)
