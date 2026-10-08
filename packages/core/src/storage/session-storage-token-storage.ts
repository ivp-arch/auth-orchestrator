import { ConfigError, TokenError } from '../errors';
import type { TokenSet, TokenStorage } from '../types';

/**
 * XSS trade-off (repo rule: persistent storage must state it explicitly):
 * storing tokens in `sessionStorage` makes them readable by *any* script running
 * in the page — if an XSS vulnerability lets an attacker inject script, they can read
 * the access token and, worse, the refresh token. Choosing `sessionStorage` over
 * `localStorage` limits *how long* the tokens are exposed (cleared when the tab
 * closes), not *whether* they are exposed. High-security apps should keep the
 * in-memory default and re-authenticate on reload. See the token storage guide
 * in the docs for details.
 */
const STORAGE_KEY = 'auth-orchestrator:tokens';
const PAYLOAD_VERSION = 1;

/** Serialized shape. `v` leaves a migration seam for future format changes. */
type StoredPayload = {
  v: number;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  /** Epoch milliseconds — `Date` does not survive JSON. */
  expiresAt: number;
};

/**
 * Opt-in `TokenStorage` backend persisting the whole token set under a single
 * key. The browser global is resolved lazily so importing this module never
 * touches `sessionStorage` at load time (SSR-safe), and tests can replace it.
 */
export class SessionStorageTokenStorage implements TokenStorage {
  /** `backend` is a seam for tests and non-browser hosts; consumers omit it. */
  constructor(private readonly backend?: Storage) {}

  private resolveBackend(): Storage {
    if (this.backend) {
      return this.backend;
    }
    const backend = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    if (!backend) {
      throw new ConfigError(
        'sessionStorage is not available in this environment. Use the default in-memory storage or provide a custom backend.',
      );
    }
    return backend;
  }

  async getTokens(): Promise<TokenSet | null> {
    const raw = this.resolveBackend().getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }

    let payload: StoredPayload;
    try {
      payload = JSON.parse(raw) as StoredPayload;
    } catch (cause) {
      throw new TokenError('Stored token data is corrupted and cannot be read.', { cause });
    }
    if (typeof payload.accessToken !== 'string' || typeof payload.expiresAt !== 'number') {
      throw new TokenError('Stored token data is malformed and cannot be read.');
    }

    // exactOptionalPropertyTypes: optionals are only present when actually stored.
    const tokens: TokenSet = {
      accessToken: payload.accessToken,
      expiresAt: new Date(payload.expiresAt),
    };
    if (typeof payload.refreshToken === 'string') {
      tokens.refreshToken = payload.refreshToken;
    }
    if (typeof payload.idToken === 'string') {
      tokens.idToken = payload.idToken;
    }
    return tokens;
  }

  async setTokens(tokens: TokenSet): Promise<void> {
    const payload: StoredPayload = {
      v: PAYLOAD_VERSION,
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt.getTime(),
    };
    if (tokens.refreshToken !== undefined) {
      payload.refreshToken = tokens.refreshToken;
    }
    if (tokens.idToken !== undefined) {
      payload.idToken = tokens.idToken;
    }
    this.resolveBackend().setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  async clear(): Promise<void> {
    this.resolveBackend().removeItem(STORAGE_KEY);
  }
}
