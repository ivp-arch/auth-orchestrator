# @auth-orchestrator/core

Framework-agnostic OAuth2/OIDC engine. Everything protocol-related lives here; the adapters only
translate it into React or Angular idioms. Root `CLAUDE.md` rules apply — especially the security
rules.

## Structure

```
src/
  index.ts              public API — the only entry consumers may rely on
  orchestrator.ts       AuthOrchestrator: config in, Promise actions + subscribable state out
  types.ts              AuthConfig, AuthState, TokenStorage, Provider, …
  events/state-store.ts StateStore<T>: minimal observer store (getState/setState/subscribe)
  errors/index.ts       AuthError + ConfigError, NetworkError, TokenError, StateError, FlowError
  providers/            Provider implementations, published as `./providers/*` subpath exports
  tokens/               token manager + in-memory / sessionStorage TokenStorage backends
  flows/                redirect sign-in/sign-out: PKCE request, callback, flow state, end session
```

Planned (from the roadmap and `CONTRIBUTING.md`): silent refresh and multi-tab sync. Both are
security-sensitive; `src/flows/` and `src/tokens/` already are.

## Rules

- **No framework, no DOM-framework, no RxJS imports.** Browser globals (`fetch`, `crypto`,
  `BroadcastChannel`, `sessionStorage`) are fine, but access them behind a small seam so tests
  can replace them and SSR imports don't crash at module load.
- **Protocol work goes through `oauth4webapi`; JWT/JWK through `jose`.** If you think you need
  something they don't provide, stop and ask.
- **State transitions only through `StateStore.setState`**, and only to valid `AuthState`
  variants. Keep `StateStore` dependency-free and synchronous; it's the contract both
  `useSyncExternalStore` and Angular signals rely on (`getState()` must return the same
  reference until state actually changes).
- **Public operations return Promises and reject with `AuthError` subclasses**, never strings
  or bare `Error`. Error `code`s are part of the public API: don't rename existing ones.
- **`TokenStorage` implementations are async** and must clear everything on `clear()`. The
  in-memory backend is the default.
- **Providers**: implement the `Provider` interface and use OIDC discovery. `AuthConfig.provider`
  lists more presets than exist (only `keycloak` and `generic-oidc` are implemented); when adding
  one, add its subpath export and tests. Prefer shared logic over copy-paste between providers
  (keycloak and generic-oidc currently duplicate discovery code).
- **Multi-tab sync** (planned) must never broadcast raw tokens over `BroadcastChannel` or
  `storage` events unless the storage strategy already exposes them there; broadcast state
  changes and let each tab read from its own storage.
- Keep `sideEffects: false` true: no top-level code that runs on import.

## Tests

- Environment: `happy-dom` (see `vitest.config.ts`), shared thresholds from the preset.
- Run: `pnpm --filter @auth-orchestrator/core test` (or `test:watch`, `test:coverage`).
- For each flow, cover: success, invalid `state`, invalid `nonce`/`iss`/`aud`, expired token,
  network failure, provider error response. Assert the thrown error class and `code`.
- Mock `fetch` and discovery documents; use fake timers for expiry and refresh skew.
