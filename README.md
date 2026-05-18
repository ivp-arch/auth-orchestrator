# Auth Orchestrator

> Modern OAuth2/OIDC client for React and Angular SPAs, secure PKCE, and a built-in AI diagnostician to automatically debug authentication errors in dev mode — without the vendor lock-in.

[![CI](https://github.com/ivp-arch/auth-orchestrator/actions/workflows/ci.yml/badge.svg)](https://github.com/ivp-arch/auth-orchestrator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> ⚠️ **Alpha**: Auth Orchestrator is in active development. APIs may change. Not for production use.

## What is Auth Orchestrator?

Production-grade OAuth/OIDC auth for React and Angular SPAs, without depending on a SaaS vendor.

- ✅ OAuth 2.0 / OIDC with PKCE
- ✅ React adapter with idiomatic hooks
- ✅ Angular adapter with signals + functional guards
- ✅ Multi-tab refresh sync, silent renew
- ✅ AI-powered diagnostician in dev mode *(coming)*
- ✅ Audited by Cure53 *(planned for 1.0)*

## Packages

| Package | Description |
| --- | --- |
| [`@auth-orchestrator/core`](./packages/core) | Framework-agnostic OAuth/OIDC orchestrator |
| [`@auth-orchestrator/react`](./packages/react) | React adapter (hooks, components, router) |
| [`@auth-orchestrator/angular`](./packages/angular) | Angular adapter (service, guards, interceptor) |

## Quick start

See the package READMEs for now. Documentation site coming soon.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md).

## License

MIT
