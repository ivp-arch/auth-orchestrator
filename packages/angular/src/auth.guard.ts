import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export function authGuard(options: { redirectTo?: string } = {}): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated()) {
      return true;
    }

    if (options.redirectTo) {
      return router.parseUrl(options.redirectTo);
    }

    void auth.signIn();
    return false;
  };
}
