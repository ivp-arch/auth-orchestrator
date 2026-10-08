import type { TokenSet, TokenStorage } from '../types';

/**
 * Default token storage. Tokens live only in the current JavaScript runtime and
 * never touch a persistent backend, so they are lost on reload but also out of
 * reach for cross-tab or storage-based attacks. This is the recommended default.
 */
export class InMemoryTokenStorage implements TokenStorage {
  private tokens: TokenSet | null = null;

  async getTokens(): Promise<TokenSet | null> {
    return this.tokens;
  }

  async setTokens(tokens: TokenSet): Promise<void> {
    this.tokens = tokens;
  }

  async clear(): Promise<void> {
    this.tokens = null;
  }
}
