import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { ApiConfigService } from './api-config.service';
import { AuthService } from './auth.service';

const isUnauthorized = (error: unknown) =>
  error instanceof HttpErrorResponse && error.status === 401;

/**
 * The single gateway for API calls: prefixes the configured server URL, attaches the bearer
 * token and, on a 401, refreshes the token once and retries before logging the user out.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  const config = inject(ApiConfigService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const absolute = req.clone({ url: config.baseUrl() + req.url });
  if (req.url.startsWith('/api/auth/')) {
    return next(absolute);
  }

  const withToken = (request: HttpRequest<unknown>) => {
    const token = auth.accessToken();
    return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  };

  return next(withToken(absolute)).pipe(
    catchError((error: unknown) => {
      if (!isUnauthorized(error)) {
        return throwError(() => error);
      }
      return from(auth.refresh()).pipe(
        switchMap((refreshed) => (refreshed ? next(withToken(absolute)) : throwError(() => error))),
        catchError((final: unknown) => {
          if (isUnauthorized(final)) {
            void auth.logout().then(() => router.navigateByUrl('/login'));
          }
          return throwError(() => final);
        }),
      );
    }),
  );
};
