import type { ButtonHTMLAttributes } from 'react';
import { useAuth } from '../hooks/useAuth';

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export function SignOutButton({ children = 'Sign out', onClick, ...rest }: Props) {
  const auth = useAuth();
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        void auth.signOut();
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
