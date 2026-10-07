# @auth-orchestrator/react

OAuth 2.0 / OpenID Connect for React applications: an `<AuthProvider>`, hooks built on
`useSyncExternalStore` and a few unstyled components. Part of
[Auth Orchestrator](https://github.com/ivp-arch/auth-orchestrator).

> [!WARNING]
> **Pre-alpha.** The examples below show the **target API**. Sign-in and token access are not
> functional yet. Do not use in production. See the
> [project status](https://github.com/ivp-arch/auth-orchestrator#status).

## Requirements

- React **19 or later**
- An OpenID Connect provider with a public client (Keycloak, Entra ID, Okta, Auth0, …) and your
  app's callback URL registered as a redirect URI

## Installation

```bash
pnpm add @auth-orchestrator/react @auth-orchestrator/core
```

## Setup

```tsx
import { type AuthConfig, AuthProvider } from '@auth-orchestrator/react';

const authConfig = {
  provider: 'keycloak',
  authority: 'https://keycloak.example.com/realms/myapp',
  clientId: 'frontend-app',
  redirectUri: `${window.location.origin}/auth/callback`,
  scopes: ['openid', 'profile', 'email'],
} satisfies AuthConfig;

export function App() {
  return (
    <AuthProvider config={authConfig}>
      <Header />
    </AuthProvider>
  );
}
```

Declare the config outside the component (or memoize it) so the provider is not re-created on
every render.

## Reading auth state

`useAuth()` returns the current state — a discriminated union on `status` — plus the actions:

```tsx
import { useAuth } from '@auth-orchestrator/react';

function Header() {
  const auth = useAuth();

  switch (auth.status) {
    case 'initializing':
      return null;
    case 'authenticated':
    case 'refreshing':
      return (
        <>
          <span>Hello, {auth.user.name}</span>
          <button type="button" onClick={() => auth.signOut()}>
            Sign out
          </button>
        </>
      );
    default:
      return (
        <button type="button" onClick={() => auth.signIn()}>
          Sign in
        </button>
      );
  }
}
```

## API

| Export | Purpose |
| --- | --- |
| `AuthProvider` | Creates the auth engine and provides it to the tree |
| `useAuth()` | Full `AuthState` + `signIn()` / `signOut()` |
| `useUser()` | `User \| null` |
| `useIsAuthenticated()` | `boolean` |
| `useAccessToken()` | Returns `() => Promise<string \| null>`; doesn't re-render on refresh |
| `<Protected fallback={…}>` | Renders children only when authenticated |
| `<SignInButton>` / `<SignOutButton>` | Unstyled buttons; accept all `<button>` props |

```tsx
import { Protected, SignInButton } from '@auth-orchestrator/react';

<Protected fallback={<SignInButton className="btn" />}>
  <Dashboard />
</Protected>;
```

## License

[MIT](https://github.com/ivp-arch/auth-orchestrator/blob/main/LICENSE)
