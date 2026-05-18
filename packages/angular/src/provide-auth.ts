import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import type { AuthConfig } from '@auth-orchestrator/core';
import { AuthService } from './auth.service';
import { AUTH_CONFIG } from './tokens';

/**
 * Function-based providers, Angular 17+ idiomatic.
 * Use in app.config.ts: providers: [provideAuth({...})]
 */
export function provideAuth(config: AuthConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: AUTH_CONFIG, useValue: config }, AuthService]);
}
