import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/auth';

/**
 * Kači JWT (Bearer) token na svaki zahtjev ka backend API-ju, i na
 * 401 (istekao/nevažeći token) automatski odjavljuje korisnika i
 * vraća ga na /login — umjesto da svaki servis posebno rukuje tim
 * slučajem.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isApiRequest = req.url.startsWith(API_BASE_URL);
  const token = authService.token();

  const authedReq =
    isApiRequest && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      const isAuthEndpoint = req.url.startsWith(`${API_BASE_URL}/auth/`);

      if (
        isApiRequest &&
        !isAuthEndpoint &&
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        authService.logout();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};
