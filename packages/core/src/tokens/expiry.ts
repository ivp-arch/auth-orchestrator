/**
 * Pure expiry helpers shared by the token layer.
 * Week 4 (automatic refresh) reuses these with its own skew configuration.
 */

/** Absolute expiry from a token response's `expires_in` (seconds). */
export function computeExpiresAt(expiresInSeconds: number, now: number = Date.now()): Date {
  return new Date(now + expiresInSeconds * 1000);
}

/**
 * Whether a token is expired. `skewSeconds` treats a token as expired *early*
 * (conservative: better to refresh a still-valid token than to send an expired one).
 */
export function isExpired(
  expiresAt: Date,
  options?: { now?: number; skewSeconds?: number },
): boolean {
  const now = options?.now ?? Date.now();
  const skewSeconds = options?.skewSeconds ?? 0;
  return now >= expiresAt.getTime() - skewSeconds * 1000;
}
