# @auth-orchestrator/angular

Angular adapter for Auth Orchestrator — OAuth 2.0 / OIDC for Angular SPAs (v20+).

> ⚠️ **Alpha**: API is not stable. Do not use in production yet.

## Installation

```bash
pnpm add @auth-orchestrator/angular @auth-orchestrator/core
```

## Quick start

```ts
// app.config.ts
import { provideAuth } from '@auth-orchestrator/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAuth({
      provider: 'keycloak',
      authority: 'https://keycloak.example.com/realms/myapp',
      clientId: 'frontend-app',
      redirectUri: window.location.origin + '/auth/callback',
      scopes: ['openid', 'profile', 'email'],
    }),
  ],
};
```

## License

MIT
