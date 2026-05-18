import { StateStore, type Unsubscribe } from './events/state-store';
import type { AuthConfig, AuthState } from './types';

/**
 * Main orchestrator. This is a v0.0.1 scaffold; the real implementation
 * is built incrementally per the Week 2-4 roadmap.
 */
export class AuthOrchestrator {
  private readonly config: AuthConfig;
  private readonly store: StateStore<AuthState>;

  constructor(config: AuthConfig) {
    this.config = config;
    this.store = new StateStore<AuthState>({ status: 'initializing' });
  }

  getState(): AuthState {
    return this.store.getState();
  }

  subscribe(listener: (state: AuthState) => void): Unsubscribe {
    return this.store.subscribe(listener);
  }

  async signIn(): Promise<void> {
    throw new Error('Not implemented yet — coming in Week 3');
  }

  async signOut(): Promise<void> {
    throw new Error('Not implemented yet — coming in Week 3');
  }
}
