# @auth-orchestrator/react

React adapter for Auth Orchestrator — OAuth 2.0 / OIDC for React SPAs.

> ⚠️ **Alpha**: API is not stable. Do not use in production yet.

## Installation

```bash
pnpm add @auth-orchestrator/react @auth-orchestrator/core
```

## Quick start

```tsx
import { AuthProvider, useAuth } from '@auth-orchestrator/react';

const config = {
  provider: 'keycloak',
  authority: 'https://keycloak.example.com/realms/myapp',
  clientId: 'frontend-app',
  redirectUri: window.location.origin + '/auth/callback',
  scopes: ['openid', 'profile', 'email'],
};

function App() {
  return (
    <AuthProvider config={config}>
      <Profile />
    </AuthProvider>
  );
}

function Profile() {
  const auth = useAuth();
  if (auth.status === 'unauthenticated') {
    return <button onClick={() => auth.signIn()}>Sign in</button>;
  }
  if (auth.status === 'authenticated') {
    return <div>Hello, {auth.user.name}</div>;
  }
  return null;
}
```

## License

MIT
