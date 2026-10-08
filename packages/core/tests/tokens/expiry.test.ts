import { describe, expect, it } from 'vitest';
import { computeExpiresAt, isExpired } from '../../src/tokens/expiry';

describe('computeExpiresAt', () => {
  it('adds the lifetime in seconds to the given timestamp', () => {
    const expiresAt = computeExpiresAt(3600, 1_000);
    expect(expiresAt.getTime()).toBe(1_000 + 3_600_000);
  });

  it('uses the current time by default', () => {
    const expiresAt = computeExpiresAt(60);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() - 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 60_000 + 1000);
  });
});

describe('isExpired', () => {
  const now = Date.parse('2026-01-01T00:00:00Z');

  it('returns false before the expiry moment', () => {
    expect(isExpired(new Date(now + 10_000), { now })).toBe(false);
  });

  it('returns true exactly at the expiry moment', () => {
    expect(isExpired(new Date(now), { now })).toBe(true);
  });

  it('returns true after the expiry moment', () => {
    expect(isExpired(new Date(now - 1), { now })).toBe(true);
  });

  it('treats a token as expired early when skewSeconds is set', () => {
    // Token still valid for 5s, but a 10s skew marks it as expired.
    expect(isExpired(new Date(now + 5_000), { now, skewSeconds: 10 })).toBe(true);
  });

  it('defaults skewSeconds to 0', () => {
    expect(isExpired(new Date(now + 5_000), { now, skewSeconds: 0 })).toBe(false);
  });

  it('uses the current time by default', () => {
    expect(isExpired(new Date(Date.now() - 1000))).toBe(true);
  });
});
