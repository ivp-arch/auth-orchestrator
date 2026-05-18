import { InjectionToken } from '@angular/core';
import type { AuthConfig } from '@auth-orchestrator/core';

export const AUTH_CONFIG = new InjectionToken<AuthConfig>('AUTH_ORCHESTRATOR_CONFIG');
