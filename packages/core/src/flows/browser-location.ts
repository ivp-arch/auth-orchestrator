import { ConfigError } from '../errors';

/**
 * Navigation seam so tests can replace `location`/`history` and SSR imports
 * never touch them at load time. Browser globals are resolved lazily on every
 * call.
 */
export interface BrowserLocation {
  /** The current document URL, or `''` when there is no location (SSR). */
  getUrl(): string;
  /** Navigates the document, unloading the current page. */
  assign(url: string): void;
  /** Replaces the URL without navigation, best-effort (never throws). */
  replaceUrl(url: string): void;
}

export const defaultBrowserLocation: BrowserLocation = {
  getUrl() {
    const location = (globalThis as { location?: Location }).location;
    return location?.href ?? '';
  },

  // `assign` (not `replace`): the IdP round-trip must not break the back button.
  assign(url) {
    const location = (globalThis as { location?: Location }).location;
    if (!location) {
      throw new ConfigError('Cannot navigate: no `location` global exists in this environment.');
    }
    location.assign(url);
  },

  replaceUrl(url) {
    const history = (globalThis as { history?: History }).history;
    try {
      history?.replaceState(history.state, '', url);
    } catch {
      // Best-effort cleanup of the authorization response parameters. The
      // security-relevant cleanup is the flow-state removal in sessionStorage,
      // which happens before this call.
    }
  },
};
