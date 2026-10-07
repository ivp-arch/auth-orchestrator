# @auth-orchestrator/react

React adapter: provider, hooks and a few convenience components. Root `CLAUDE.md` rules apply.

## Structure

```
src/
  index.ts                   public API
  AuthProvider.tsx           creates one AuthOrchestrator per provider (lazy useState init)
  hooks/useAuth.ts           primary hook: AuthState + signIn/signOut
  hooks/useUser.ts, useIsAuthenticated.ts, useAccessToken.ts
  components/Protected.tsx, SignInButton.tsx, SignOutButton.tsx
```

## Rules

- **React ≥ 19, function components and hooks only.**
- **Subscribe to core only via `useSyncExternalStore`** with `orchestrator.subscribe` and
  `orchestrator.getState`. No `useState` + `useEffect` mirroring of auth state (tearing and
  double renders). Derived hooks (`useUser`, `useIsAuthenticated`) should use a selector so they
  re-render only when their slice changes.
- **One orchestrator per `AuthProvider`**, created once. Effects must be StrictMode-safe: the
  initialization/callback handling planned for Week 5 must be idempotent when effects run twice.
- **No protocol logic here** — callback parsing, refresh, token handling belong in core.
- **Hooks throw a clear error outside `AuthProvider`** (as `useAuth` does). Keep the message
  format consistent across hooks.
- **SSR-safe imports**: no browser globals at module top level; provide a `getServerSnapshot`
  when SSR support is added.
- Components stay unstyled and accept standard props (`children`, `className`, button props);
  no CSS or UI library dependencies.

## Tests

- Vitest + `@testing-library/react` in `happy-dom`.
- Test hooks through a real `AuthProvider` with a mocked orchestrator; include a StrictMode case.
- Run: `pnpm --filter @auth-orchestrator/react test`.
