import { ConfigError, StateError } from '../errors';

/**
 * The in-flight sign-in flow: the PKCE code verifier, `state` and `nonce` must
 * survive the redirect to the identity provider and back.
 *
 * XSS trade-off (repo rule: persistent storage must state it explicitly):
 * the code verifier and nonce are *secrets of the flow* — any script running in
 * the page can read them from `sessionStorage`. An attacker who can do that can
 * already steal tokens from the page, but the verifier lets them complete the
 * code exchange in their own session. The values are short-lived (see the TTL
 * below), removed immediately after the callback, and never give access to
 * tokens by themselves. Keeping them in memory only would break the redirect
 * flow entirely: the page unloads on the way to the provider.
 */
export const FLOW_STORAGE_KEY = 'auth-orchestrator:flow';
export const FLOW_STATE_TTL_MS = 10 * 60_000;
const PAYLOAD_VERSION = 1;

export type SignInFlowState = {
  /** PKCE code verifier — S256 pair of the code_challenge sent to the provider. */
  codeVerifier: string;
  /** Anti-CSRF binding between request and response. */
  state: string;
  /** Binds the ID token to this specific sign-in. */
  nonce: string;
  /** Where the provider redirected back to; must match the token request. */
  redirectUri: string;
  /** Creation time in epoch milliseconds, for TTL enforcement. */
  createdAt: number;
};

/** Serialized shape. `v` leaves a migration seam for future format changes. */
type StoredPayload = {
  v: number;
  codeVerifier: string;
  state: string;
  nonce: string;
  redirectUri: string;
  createdAt: number;
};

/** A flow is usable while it is younger than the TTL. Pure, so tests can pin `now`. */
export function isFlowStateFresh(flow: SignInFlowState, now: number = Date.now()): boolean {
  return now - flow.createdAt <= FLOW_STATE_TTL_MS;
}

/**
 * Persists the in-flight sign-in flow under a single key. The browser global is
 * resolved lazily so importing this module never touches `sessionStorage` at
 * load time (SSR-safe), and tests can replace or inject the backend.
 */
export class FlowStateStorage {
  /** `backend` is a seam for tests and non-browser hosts; consumers omit it. */
  constructor(private readonly backend?: Storage) {}

  private resolveBackend(): Storage {
    if (this.backend) {
      return this.backend;
    }
    const backend = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    if (!backend) {
      throw new ConfigError(
        'sessionStorage is not available in this environment, so the sign-in flow cannot be persisted across the redirect.',
      );
    }
    return backend;
  }

  save(flow: SignInFlowState): void {
    const payload: StoredPayload = { v: PAYLOAD_VERSION, ...flow };
    this.resolveBackend().setItem(FLOW_STORAGE_KEY, JSON.stringify(payload));
  }

  /**
   * The in-flight flow, or `null` when none was saved. Corrupted or malformed
   * data rejects as `StateError` `ERR_FLOW_STATE`: an unreadable flow can never
   * be trusted to complete a callback.
   */
  load(): SignInFlowState | null {
    const raw = this.resolveBackend().getItem(FLOW_STORAGE_KEY);
    if (raw === null) {
      return null;
    }

    let payload: StoredPayload;
    try {
      payload = JSON.parse(raw) as StoredPayload;
    } catch (cause) {
      throw new StateError('The stored sign-in flow is corrupted and cannot be read.', {
        cause,
        code: 'ERR_FLOW_STATE',
      });
    }
    if (
      typeof payload.codeVerifier !== 'string' ||
      typeof payload.state !== 'string' ||
      typeof payload.nonce !== 'string' ||
      typeof payload.redirectUri !== 'string' ||
      typeof payload.createdAt !== 'number'
    ) {
      throw new StateError('The stored sign-in flow is malformed and cannot be used.', {
        code: 'ERR_FLOW_STATE',
      });
    }
    return {
      codeVerifier: payload.codeVerifier,
      state: payload.state,
      nonce: payload.nonce,
      redirectUri: payload.redirectUri,
      createdAt: payload.createdAt,
    };
  }

  clear(): void {
    this.resolveBackend().removeItem(FLOW_STORAGE_KEY);
  }
}
