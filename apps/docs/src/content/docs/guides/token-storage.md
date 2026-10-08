---
title: Token storage
description: Where access, refresh and ID tokens live — the in-memory default, the sessionStorage opt-in, and custom backends.
---

Auth Orchestrator stores the whole token set (access, refresh and ID token, plus expiry) behind a
single `TokenStorage` interface. You never handle raw tokens yourself: `getAccessToken()` reads
them for you and rejects with a typed error when it cannot return a usable token.

## The default: in-memory

If you do not configure anything, tokens live only in the current JavaScript runtime:

```ts
import type { AuthConfig } from '@auth-orchestrator/core';

const config: AuthConfig = {
  provider: 'keycloak',
  authority: 'https://keycloak.example.com/realms/myapp',
  clientId: 'frontend-app',
  redirectUri: `${window.location.origin}/auth/callback`,
  scopes: ['openid', 'profile'],
  // tokenStorage omitted → in-memory (recommended)
};
```

Tokens are lost when the page reloads, and that is the point: nothing is written to
`sessionStorage`, `localStorage` or cookies, so no injected script can read tokens from a
persistent storage backend. For high-security apps this is the recommended setup — the cost is
that a reload requires a new sign-in (or a silent one, once refresh is implemented).

## Opt-in: sessionStorage

```ts
const config: AuthConfig = {
  // …same fields as above…
  tokenStorage: 'sessionStorage',
};
```

`SessionStorageTokenStorage` persists the token set under a single
`auth-orchestrator:tokens` key, so it survives reloads within the same tab.

### XSS trade-off

**Read this before enabling it.** Anything in `sessionStorage` is readable by any script running in
your page. If your app has an XSS vulnerability, an attacker can read the access token and —
worse — the refresh token. Choosing `sessionStorage` over `localStorage` limits *how long* tokens
are exposed (they are cleared when the tab closes), not *whether* they are exposed. Keep the
in-memory default if your threat model treats XSS as realistic; most enterprise environments do.

## Custom backends

Implement `TokenStorage` and pass the instance directly. All operations are async, so IndexedDB,
encrypted or BFF/cookie backends fit without changes to the interface:

```ts
import type { TokenSet, TokenStorage } from '@auth-orchestrator/core';

class EncryptedTokenStorage implements TokenStorage {
  async getTokens(): Promise<TokenSet | null> {
    // read and decrypt from your backend
    return null;
  }

  async setTokens(tokens: TokenSet): Promise<void> {
    // encrypt and persist
  }

  async clear(): Promise<void> {
    // remove everything this storage wrote
  }
}

const config: AuthConfig = {
  // …same fields as above…
  tokenStorage: new EncryptedTokenStorage(),
};
```

`clear()` must remove everything the backend wrote for this library, nothing else.

## Reading tokens: getAccessToken()

`getAccessToken()` returns the current access token or rejects with a typed error:

| `error.code`        | Meaning                                              |
| ------------------ | ---------------------------------------------------- |
| `ERR_TOKEN_MISSING` | Nothing is stored yet — the user has not signed in. |
| `ERR_TOKEN_EXPIRED` | The stored token is past its expiry (with skew).     |

```ts
import { TokenError, AuthOrchestrator } from '@auth-orchestrator/core';

try {
  const token = await auth.getAccessToken();
} catch (error) {
  if (error instanceof TokenError && error.code === 'ERR_TOKEN_EXPIRED') {
    // schedule a refresh / silent sign-in (refresh arrives in a later release)
  }
}
```

Token values never appear in error messages or in `AuthError.toJSON()`, so errors are safe to
forward to logging tools.