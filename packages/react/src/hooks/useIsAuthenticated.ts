import { useAuth } from './useAuth';

export function useIsAuthenticated(): boolean {
  const auth = useAuth();
  return auth.status === 'authenticated' || auth.status === 'refreshing';
}
