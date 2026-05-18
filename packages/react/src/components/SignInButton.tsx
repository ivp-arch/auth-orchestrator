import type { ButtonHTMLAttributes } from 'react';
import { useAuth } from '../hooks/useAuth';

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export function SignInButton({ children = 'Sign in', onClick, ...rest }: Props) {
  const auth = useAuth();
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        void auth.signIn();
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
