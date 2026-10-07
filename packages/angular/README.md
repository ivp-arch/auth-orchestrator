# @auth-orchestrator/angular

OAuth 2.0 / OpenID Connect for Angular applications: `provideAuth()`, a signals-based
`AuthService`, a functional route guard and an HTTP interceptor. Part of
[Auth Orchestrator](https://github.com/ivp-arch/auth-orchestrator).

> [!WARNING]
> **Pre-alpha.** The examples below show the **target API**. Sign-in, the guard redirect and the
> interceptor are not functional yet. Do not use in production. See the
> [project status](https://github.com/ivp-arch/auth-orchestrator#status).

## Requirements

- Angular **21 or later** (`@angular/core`, `@angular/common`, `@angular/router`)
- RxJS 7 or later
- An OpenID Connect provider with a public client (Keycloak, Entra ID, Okta, Auth0, …) and your
  app's callback URL registered as a redirect URI

## Installation

```bash
pnpm add @auth-orchestrator/angular @auth-orchestrator/core
```

## Setup

```ts
// app.config.ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { authInterceptor, provideAuth } from '@auth-orchestrator/angular';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAuth({
      provider: 'keycloak',
      authority: 'https://keycloak.example.com/realms/myapp',
      clientId: 'frontend-app',
      redirectUri: `${window.location.origin}/auth/callback`,
      scopes: ['openid', 'profile', 'email'],
    }),
    provideHttpClient(
      withInterceptors([
        // Attach the access token only to your own API
        authInterceptor({ matchUrls: [/^https:\/\/api\.example\.com\//] }),
      ]),
    ),
  ],
};
```

## Protecting routes

```ts
// app.routes.ts
import type { Routes } from '@angular/router';
import { authGuard } from '@auth-orchestrator/angular';

export const routes: Routes = [
  {
    path: 'dashboard',
    canActivate: [authGuard()], // starts sign-in when the user is not authenticated
    loadComponent: () => import('./dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard({ redirectTo: '/login' })], // or redirect to your own page
    loadComponent: () => import('./admin.component').then((m) => m.AdminComponent),
  },
];
```

## Reading auth state

`AuthService` exposes readonly signals, so templates update without manual subscriptions:

```ts
import { Component, inject } from '@angular/core';
import { AuthService } from '@auth-orchestrator/angular';

@Component({
  selector: 'app-header',
  template: `
    @if (auth.isAuthenticated()) {
      <span>Hello, {{ auth.user()?.name }}</span>
      <button type="button" (click)="auth.signOut()">Sign out</button>
    } @else {
      <button type="button" (click)="auth.signIn()">Sign in</button>
    }
  `,
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
}
```

| Member | Type |
| --- | --- |
| `state` | `Signal<AuthState>` — full state, narrow on `state().status` |
| `user` | `Signal<User \| null>` |
| `isAuthenticated` | `Signal<boolean>` |
| `signIn()` / `signOut()` | `Promise<void>` |

## License

[MIT](https://github.com/ivp-arch/auth-orchestrator/blob/main/LICENSE)
