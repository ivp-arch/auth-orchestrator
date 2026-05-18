import type { AuthState } from '@auth-orchestrator/core';
import { useContext, useSyncExternalStore } from 'react';
import { AuthContext } from '../AuthProvider';

/**
 * Primary hook. Returns the current AuthState (discriminated union) plus action methods.
 * Re-renders only when the state actually changes (via useSyncExternalStore).
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const state: AuthState = useSyncExternalStore(
    (callback) => context.orchestrator.subscribe(callback),
    () => context.orchestrator.getState(),
  );

  return {
    ...state,
    signIn: () => context.orchestrator.signIn(),
    signOut: () => context.orchestrator.signOut(),
  };
}
