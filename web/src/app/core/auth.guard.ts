import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiConfigService } from './api-config.service';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (inject(ApiConfigService).needsSetup()) {
    return router.createUrlTree(['/settings']);
  }
  return inject(AuthService).isAuthenticated() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService).isAuthenticated() ? router.createUrlTree(['/']) : true;
};
