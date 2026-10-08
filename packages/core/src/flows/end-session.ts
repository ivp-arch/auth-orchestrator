import type { ProviderMetadata } from '../types';

export type EndSessionInput = {
  /** Where the provider should send the user back after logout, when set. */
  postLogoutRedirectUri?: string | undefined;
  /**
   * The stored ID token. It travels as a query parameter to the provider that
   * issued it — the standard `id_token_hint` trade-off: it proves the logout
   * request belongs to a real session of this client.
   */
  idTokenHint?: string | undefined;
};

/**
 * The end-session URL, or `null` when the provider does not publish an
 * `end_session_endpoint` (then only a local sign-out is possible).
 */
export function buildEndSessionUrl(metadata: ProviderMetadata, input: EndSessionInput): URL | null {
  if (metadata.endSessionEndpoint === undefined) {
    return null;
  }
  const url = new URL(metadata.endSessionEndpoint);
  if (input.postLogoutRedirectUri !== undefined) {
    url.searchParams.set('post_logout_redirect_uri', input.postLogoutRedirectUri);
  }
  if (input.idTokenHint !== undefined) {
    url.searchParams.set('id_token_hint', input.idTokenHint);
  }
  return url;
}
