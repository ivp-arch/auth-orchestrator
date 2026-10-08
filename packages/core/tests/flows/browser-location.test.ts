import { describe, expect, it, vi } from 'vitest';
import { ConfigError } from '../../src/errors';
import { defaultBrowserLocation } from '../../src/flows/browser-location';

describe('defaultBrowserLocation', () => {
  it('returns the current href when a location global exists', () => {
    vi.stubGlobal('location', { href: 'https://app.example.com/callback?code=x' });
    expect(defaultBrowserLocation.getUrl()).toBe('https://app.example.com/callback?code=x');
  });

  it("returns '' when there is no location global (SSR)", () => {
    vi.stubGlobal('location', undefined);
    expect(defaultBrowserLocation.getUrl()).toBe('');
  });

  it('navigates through location.assign', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { href: 'https://app.example.com/', assign });
    defaultBrowserLocation.assign('https://auth.example.com/auth');
    expect(assign).toHaveBeenCalledWith('https://auth.example.com/auth');
  });

  it('rejects assign with ConfigError when there is no location global', () => {
    expect.hasAssertions();
    vi.stubGlobal('location', undefined);
    try {
      defaultBrowserLocation.assign('https://auth.example.com/auth');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).code).toBe('ERR_CONFIG');
    }
  });

  it('replaces the URL through history.replaceState', () => {
    const replaceState = vi.fn();
    vi.stubGlobal('history', { replaceState, state: null });
    defaultBrowserLocation.replaceUrl('https://app.example.com/callback');
    expect(replaceState).toHaveBeenCalledWith(null, '', 'https://app.example.com/callback');
  });

  it('swallows replaceUrl failures when there is no history global', () => {
    vi.stubGlobal('history', undefined);
    expect(() =>
      defaultBrowserLocation.replaceUrl('https://app.example.com/callback'),
    ).not.toThrow();
  });
});
