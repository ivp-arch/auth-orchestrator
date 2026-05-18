/**
 * Returns a function that fetches the current access token.
 * Lazy — calling this hook does NOT cause re-renders on token refresh.
 * Pattern inspired by TanStack Query's queryClient.
 */
export function useAccessToken(): () => Promise<string | null> {
  // TODO Week 5: real implementation
  return async () => null;
}
