# Auth Orchestrator

> Modern OAuth 2.0 / OpenID Connect client for React and Angular SPAs — PKCE, token refresh,
> multi-tab sync, route guards and HTTP interceptors, without depending on a SaaS vendor.

[![CI](https://github.com/ivp-arch/auth-orchestrator/actions/workflows/ci.yml/badge.svg)](https://github.com/ivp-arch/auth-orchestrator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [!WARNING]
> **Pre-alpha.** The public API is being designed in the open and most features are not
> implemented yet. Do not use in production. Breaking changes will happen on every `0.x` release.

## Why

Every SPA team ends up rewriting the same delicate code: Authorization Code + PKCE, token storage,
silent refresh, keeping several tabs in sync, protecting routes, attaching tokens to API calls.
Auth Orchestrator does that once, works with any standards-compliant OpenID Connect provider
(Keycloak, Entra ID, Okta, Auth0, …) and gives each framework an idiomatic API:

- **Angular** — `provideAuth()`, a signals-based `AuthService`, functional `authGuard` and
  `authInterceptor`. Built for enterprise apps on modern Angular (standalone, signals, zoneless).
- **React** — `<AuthProvider>` and hooks built on `useSyncExternalStore`.
- **Core** — a framework-agnostic TypeScript engine built on
  [`oauth4webapi`](https://github.com/panva/oauth4webapi) and [`jose`](https://github.com/panva/jose).

In development mode, an optional **AI diagnostician** will explain configuration errors such as a
wrong redirect URI or missing scopes. It is never included in production builds.

## Status

| Feature | Status |
| --- | --- |
| Package structure, public types, state model | ✅ Scaffolded |
| OIDC discovery (Keycloak, generic OIDC) | 🚧 In progress |
| Token layer and storage (memory, `sessionStorage`) | 📋 Planned |
| Sign-in / sign-out — Authorization Code + PKCE | 📋 Planned |
| Automatic refresh, multi-tab sync | 📋 Planned |
| Angular guard and interceptor (Bearer token, refresh on 401) | 📋 Planned |
| AI diagnostician (dev only) | 📋 Planned |
| Documentation site | 📋 Planned |
| Independent security audit | 📋 Planned before 1.0 |

## Packages

| Package | Description |
| --- | --- |
| [`@auth-orchestrator/core`](./packages/core) | Framework-agnostic OAuth 2.0 / OIDC engine |
| [`@auth-orchestrator/angular`](./packages/angular) | Angular adapter: `provideAuth()`, signals, guard, interceptor |
| [`@auth-orchestrator/react`](./packages/react) | React adapter: provider, hooks, components |

Usage examples are in each package README. They show the **target API**; see the status table
for what already works.

## Security principles

- Authorization Code flow with PKCE (S256) only — no implicit flow, no password grant.
- Tokens kept in memory by default; persistent storage is opt-in and documented with its
  trade-offs.
- Protocol and crypto primitives delegated to audited, spec-compliant libraries.
- Follows the [OAuth 2.0 Security BCP (RFC 9700)](https://datatracker.ietf.org/doc/html/rfc9700)
  and *OAuth 2.0 for Browser-Based Applications*.

Found a vulnerability? Please report it privately — see [SECURITY.md](./SECURITY.md).

## Contributing

The repository is a pnpm + Turborepo monorepo. See [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
pnpm install
pnpm build
pnpm test
```

## License

[MIT](./LICENSE)
