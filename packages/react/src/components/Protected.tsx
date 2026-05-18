import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

type ProtectedProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export function Protected({ children, fallback = null }: ProtectedProps) {
  const auth = useAuth();
  if (auth.status === 'authenticated' || auth.status === 'refreshing') {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
