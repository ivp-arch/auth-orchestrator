import { TokenError } from '../errors';
import type { TokenSet, TokenStorage } from '../types';
import { isExpired } from './expiry';

/**
 * Internal token service. Owns every token read/write so that Week 4 (automatic
 * refresh) can wrap this class without touching the orchestrator or the adapters.
 * Token values never appear in error messages or causes.
 */
export class TokenManager {
  constructor(
    private readonly storage: TokenStorage,
    private readonly skewSeconds: number = 0,
  ) {}

  async storeTokens(tokens: TokenSet): Promise<void> {
    await this.storage.setTokens(tokens);
  }

  /**
   * The current access token, rejecting with a typed error when it cannot be used:
   * `ERR_TOKEN_MISSING` when nothing is stored, `ERR_TOKEN_EXPIRED` when the
   * stored token has expired (honoring the configured refresh skew).
   */
  async getValidAccessToken(): Promise<string> {
    const tokens = await this.storage.getTokens();
    if (tokens === null) {
      throw new TokenError('No tokens are stored. Sign in first.', {
        code: 'ERR_TOKEN_MISSING',
      });
    }
    if (isExpired(tokens.expiresAt, { skewSeconds: this.skewSeconds })) {
      throw new TokenError('The access token has expired.', { code: 'ERR_TOKEN_EXPIRED' });
    }
    return tokens.accessToken;
  }

  /**
   * The stored token set as-is (no expiry check). Sign-out uses this to read the
   * ID token for the `id_token_hint` even when the access token has expired.
   */
  async getTokens(): Promise<TokenSet | null> {
    return this.storage.getTokens();
  }

  async clear(): Promise<void> {
    await this.storage.clear();
  }
}
