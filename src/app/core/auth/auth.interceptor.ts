import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/** Any 401 from the BFF (expired/revoked session) sends the user back to the login page. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && req.url.startsWith('/api/') && !req.url.endsWith('/me')) {
        void router.navigate(['/login'], { queryParams: { returnTo: router.url } });
      }
      return throwError(() => err);
    }),
  );
};
