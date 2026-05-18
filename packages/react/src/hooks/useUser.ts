import { useAuth } from './useAuth';

export function useUser() {
  const auth = useAuth();
  return auth.status === 'authenticated' || auth.status === 'refreshing' ? auth.user : null;
}
