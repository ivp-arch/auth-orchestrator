import { computed, Injectable, inject, type Signal, signal } from '@angular/core';
import { AuthOrchestrator, type AuthState, type User } from '@auth-orchestrator/core';
import { AUTH_CONFIG } from './tokens';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(AUTH_CONFIG);
  private readonly orchestrator = new AuthOrchestrator(this.config);
  private readonly stateSignal = signal<AuthState>(this.orchestrator.getState());

  readonly state: Signal<AuthState> = this.stateSignal.asReadonly();

  readonly user: Signal<User | null> = computed(() => {
    const s = this.stateSignal();
    return s.status === 'authenticated' || s.status === 'refreshing' ? s.user : null;
  });

  readonly isAuthenticated: Signal<boolean> = computed(() => {
    const s = this.stateSignal();
    return s.status === 'authenticated' || s.status === 'refreshing';
  });

  constructor() {
    // Bridge: core's observer → Angular's signal
    this.orchestrator.subscribe((state) => this.stateSignal.set(state));
  }

  async signIn(): Promise<void> {
    await this.orchestrator.signIn();
  }

  async signOut(): Promise<void> {
    await this.orchestrator.signOut();
  }
}
