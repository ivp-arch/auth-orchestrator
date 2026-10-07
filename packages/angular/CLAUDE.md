# @auth-orchestrator/angular

Angular adapter — **the flagship package** (enterprise target: banks, PA, healthcare). It must
feel like first-party Angular. Root `CLAUDE.md` rules apply.

## Structure

```
src/
  index.ts             public API
  provide-auth.ts      provideAuth(config): EnvironmentProviders — the only setup entry point
  tokens.ts            AUTH_CONFIG InjectionToken
  auth.service.ts      AuthService: wraps AuthOrchestrator, exposes readonly signals
  auth.guard.ts        authGuard(options): CanActivateFn
  auth.interceptor.ts  authInterceptor(options): HttpInterceptorFn (pass-through until Week 6)
```

## Rules

- **Modern Angular only** (peer `>= 21`): standalone, `provide*()` functions, functional guards
  and interceptors, `inject()`. No NgModules, no class-based guards/interceptors, no constructor
  injection in new code.
- **Signals for state, Promises for actions.** `AuthService` exposes readonly `Signal`s
  (`state`, `user`, `isAuthenticated`) derived with `computed()` from a single writable signal
  that mirrors core's `StateStore`. Don't expose writable signals. RxJS is a peer only because
  `HttpInterceptorFn` needs it — don't build the public API on Observables. If an Observable
  API is requested, offer `toObservable()` interop instead.
- **No protocol logic here.** Token attach/refresh, sign-in, callback handling belong in core;
  the adapter calls core and maps results.
- **Zoneless-compatible.** Don't depend on Zone.js to trigger change detection; signal updates
  must be enough. `zone.js` in devDependencies is only for tests.
- **AOT / build output — open issue.** The package is currently built with tsup (esbuild), and
  `AuthService` uses `@Injectable`. Without `ng-packagr` partial compilation, decorators aren't
  Ivy-compiled, which can force JIT at runtime in AOT apps. Until this is decided (move to
  `ng-packagr`, or drop decorators entirely): don't add new decorators (`@Injectable`, `@Component`,
  `@Directive`, `@Pipe`); prefer `InjectionToken` with `factory` and plain functions. Any
  component/directive work requires settling the build question first.
- **Interceptor**: must only attach tokens to URLs matched by `matchUrls` and never to
  `excludeUrls` or third-party origins by default; must not leak tokens to the identity
  provider's own endpoints. 401 retry must refresh once and not loop.
- **Guard**: returning `false` after triggering `signIn()` is intentional (redirect flow). Keep
  guards synchronous on the signal where possible; await only the `initializing` state.

## Tests

- Vitest with Angular TestBed (`TestBed.configureTestingModule({ providers: [provideAuth(…)] })`),
  `provideHttpClientTesting()` for the interceptor, `RouterTestingHarness` for guards.
- Mock `@auth-orchestrator/core`'s orchestrator rather than real network.
- Run: `pnpm --filter @auth-orchestrator/angular test`.
