import { describe, expect, it } from 'vitest';
import { buildEndSessionUrl } from '../../src/flows/end-session';
import { END_SESSION_ENDPOINT, TEST_METADATA } from './helpers/idp';

describe('buildEndSessionUrl', () => {
  it('returns null when the provider has no end-session endpoint', () => {
    expect(buildEndSessionUrl(TEST_METADATA, {})).toBeNull();
  });

  it('builds the URL with id_token_hint and post_logout_redirect_uri', () => {
    const url = buildEndSessionUrl(
      { ...TEST_METADATA, endSessionEndpoint: END_SESSION_ENDPOINT },
      { postLogoutRedirectUri: 'https://app.example.com/', idTokenHint: 'id-token-value' },
    );

    expect(url).not.toBeNull();
    expect(url?.origin + url?.pathname).toBe(END_SESSION_ENDPOINT);
    expect(url?.searchParams.get('id_token_hint')).toBe('id-token-value');
    expect(url?.searchParams.get('post_logout_redirect_uri')).toBe('https://app.example.com/');
  });

  it('omits the optional parameters when not provided', () => {
    const url = buildEndSessionUrl(
      { ...TEST_METADATA, endSessionEndpoint: END_SESSION_ENDPOINT },
      {
        idTokenHint: 'id-token-value',
      },
    );
    expect(url?.searchParams.has('post_logout_redirect_uri')).toBe(false);
  });
});
