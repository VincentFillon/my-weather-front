import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  if (
    req.url.includes(environment.apiUrl) &&
    !req.url.includes('/login') &&
    !req.url.includes('/register')
  ) {
    const authService = inject(AuthService);
    const clonedRequest = req.clone({
      headers: req.headers.set(
        'Authorization',
        'Bearer ' + authService.getToken()
      ),
    });
    return next(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.warn(
            '[AuthInterceptor] token expiré ou invalide : déconnexion'
          );
          // Token expiré ou invalide
          authService.logout();
        }
        return throwError(() => error);
      })
    );
  }
  return next(req);
}
