import { type AuthConfig, AuthOrchestrator } from '@auth-orchestrator/core';
import { createContext, type ReactNode, useEffect, useState } from 'react';

export type AuthContextValue = {
  orchestrator: AuthOrchestrator;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  config: AuthConfig;
  children: ReactNode;
};

export function AuthProvider({ config, children }: AuthProviderProps) {
  const [orchestrator] = useState(() => new AuthOrchestrator(config));

  useEffect(() => {
    // TODO Week 5: trigger initialization, callback handling, etc.
  }, [orchestrator]);

  return <AuthContext.Provider value={{ orchestrator }}>{children}</AuthContext.Provider>;
}
