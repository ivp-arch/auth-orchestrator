# Auth Orchestrator

Open-source OAuth2/OIDC client for React and Angular SPAs: PKCE login, token storage and refresh,
multi-tab sync, route guards, HTTP interceptors, plus a dev-only AI "diagnostician" that explains
configuration errors. No SaaS vendor dependency.

**Primary market: Angular enterprise (banks, public administration, healthcare).** The Angular
adapter is the flagship product, not a port. Weigh every change against: Angular ≥ 21
signals-first, AOT compatibility, strict CSP, corporate proxies, long-lived LTS apps.

Status: alpha, all packages at `0.0.x`. Most runtime behaviour is still scaffold
(`signIn`/`signOut` throw "Not implemented"). `// TODO Week N` comments map to the roadmap —
keep that convention when leaving work for later.

## Layout

```
packages/core      @auth-orchestrator/core     framework-agnostic TS (oauth4webapi, jose)
packages/react     @auth-orchestrator/react    hooks over useSyncExternalStore
packages/angular   @auth-orchestrator/angular  signals, provideAuth(), functional guard/interceptor
apps/docs                                      consumer docs (Markdown in src/content/docs, Starlight later)
apps/playground|e2e                            placeholders, private, ignored by Changesets
tooling/tsup-config, tooling/vitest-preset     shared internal presets
```

Dependency direction is one-way: `react` / `angular` → `core`. Core never imports a framework,
RxJS or anything DOM-framework specific. Adapters never re-implement protocol logic — if an
adapter needs something, add it to core first.

Each package (and `apps/docs`) has its own `CLAUDE.md` with package-specific rules.

## Commands

Run from the repo root (pnpm 11, Node ≥ 22.10, see `.nvmrc`):

```bash
pnpm install
pnpm build                       # turbo, respects ^build
pnpm test                        # vitest in every package
pnpm type-check
pnpm lint                        # biome check .
pnpm lint:fix
pnpm --filter @auth-orchestrator/core test       # single package
pnpm --filter @auth-orchestrator/core test:watch
pnpm changeset                   # required for any change to a publishable package
```

Before declaring a task done: `pnpm lint && pnpm type-check && pnpm build && pnpm test`.
CI currently runs lint, type-check and build only (tests are commented out in `ci.yml`), so do
not rely on CI to catch failing tests.

## Architectural rules

- **Promises for one-shot operations** (`signIn`, `signOut`, refresh, `getAccessToken`);
  **observable state** via core's `StateStore<T>`, bridged to `signal()` / `useSyncExternalStore`
  by the adapters. Don't introduce RxJS, EventEmitter or a state library in core.
- **`AuthState` is a discriminated union on `status`.** Add states by extending the union, never
  with optional flags. Consumers narrow on `status`.
- **Narrow public API.** Anything not exported from a package's `src/index.ts` is internal. Adding
  an export is an API decision: call it out explicitly in the PR and the changeset.
- **`TokenStorage` is async-only**, even for sync backends, so BFF/cookie, IndexedDB and
  encrypted storage can be added without breaking changes.
- **Typed errors only.** Throw `AuthError` subclasses (`ConfigError`, `NetworkError`,
  `TokenError`, `StateError`) with a stable `code`. Never throw bare `Error` from new code.
- **AI diagnostician is dev-only.** It must be tree-shaken out of production builds and must
  never send tokens, codes or user claims anywhere.

## Security rules (non-negotiable)

This is an auth library: correctness beats convenience.

- Follow the OAuth 2.0 Security BCP (RFC 9700) and *OAuth 2.0 for Browser-Based Apps*.
  Authorization Code + PKCE (S256) only — no implicit flow, no `plain` PKCE, no ROPC.
- Use `oauth4webapi` and `jose` for protocol and crypto primitives. Never hand-roll JWT parsing,
  signature checks, random generation or PKCE hashing. Use `crypto.getRandomValues` /
  `crypto.subtle` only through those libraries or where they require it.
- Always validate `state`, `nonce`, `iss`, `aud`, `exp` and the PKCE verifier.
- Never log, serialize or put in error messages: access/refresh/ID tokens, authorization codes,
  PKCE verifiers, client secrets. `AuthError.toJSON()` must keep masking sensitive fields.
- No `eval`, `new Function`, inline-script injection or anything that breaks a strict CSP.
- Default storage is in-memory. Any change that persists tokens (`sessionStorage`,
  `localStorage`, IndexedDB) must state the XSS trade-off in code comments and docs.
- Per `CONTRIBUTING.md`, changes under `packages/core/src/flows/`, `packages/core/src/tokens/`
  or any crypto-related code need two reviewer approvals — flag this in the PR description.

If a request conflicts with these rules, say so and propose the compliant alternative instead of
implementing it.

## Code style

- TypeScript strict with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` (see
  `tsconfig.base.json`). No `any` (Biome error), avoid non-null assertions.
- Biome is the only formatter/linter: 2 spaces, single quotes, semicolons, trailing commas,
  width 100. `import type` / `export type` are enforced. Don't add ESLint or Prettier config.
- No `console.*` in library code (Biome warns). Logging, if needed, goes through an injectable
  logger in core.
- Dependencies are pinned to exact versions. Don't add runtime dependencies to a publishable
  package without asking; framework packages go in `peerDependencies`.
- Code, comments, commit messages and docs are in English.

## Tests

- Vitest 4 with the shared preset (`tooling/vitest-preset`): coverage thresholds 80% lines /
  functions / statements, 75% branches.
- Every new core module gets unit tests next to it or under `tests/`. Protocol code needs tests
  for the failure paths (bad `state`, expired token, network error), not just the happy path.
- Mock the network at `fetch` level; never hit a real identity provider in unit tests.

## Documentation

- **Consumer guides live in `apps/docs/src/content/docs/`** (Starlight content layout), not in a
  root `docs/` folder. A public feature lands together with its docs page in the same PR; see
  `apps/docs/CLAUDE.md`.
- **Package READMEs are the npm landing page**: install, requirements, minimal setup, API table,
  link to the docs. Keep them short, use absolute GitHub/npm URLs (relative links break on npm),
  and keep every sample compiling against the current public API.
- **Root README status table** is the single source of truth for what works. Update it when a
  feature moves from planned to implemented; never mark a feature ✅ before it ships.

## Git and releases

- **Commits and PRs are authored by the user, not the agent.** Use the git identity already
  configured (`user.name` / `user.email`); never pass `--author`, never change git config, and
  never add `Co-Authored-By`, "Generated with …", session links or any other trailer or line
  that mentions an AI tool — in commit messages, PR titles/descriptions or changesets.
  (Enforced for Claude Code by `attribution` in `.claude/settings.json`.)
- Conventional Commits (`feat(core): …`, `fix(angular): …`, `chore: …`). Scope = package name.
- Every PR that changes published code in `packages/*` needs a changeset (`pnpm changeset`).
  Docs-only changes (READMEs, `CLAUDE.md`) don't; they ship with the next release. The three
  packages are `linked` in `.changeset/config.json`, so their versions move together.
- Release flow: changeset PR merged → `changesets/action` opens **"chore: release"** → merging it
  publishes to npm with provenance (`release.yml`). Never run `changeset publish` or
  `npm publish` locally, and never edit package versions or `CHANGELOG.md` by hand.
- Alpha releases go through Changesets pre mode (`pnpm changeset pre enter alpha`); check
  `.changeset/pre.json` before assuming which mode is active.
