import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../services/api.config';
import { AuthTokenService } from '../services/auth-token.service';
import { ToastService } from '../services/toast.service';

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/captcha', '/auth/reset-password'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authTokenService = inject(AuthTokenService);
  const toastService = inject(ToastService);
  const router = inject(Router);
  const isApiRequest = request.url.startsWith(API_BASE_URL) || request.url.startsWith('/api');
  const isPublicAuthRequest = PUBLIC_AUTH_PATHS.some((path) => request.url.includes(path));
  const token = authTokenService.getToken();

  const apiRequest = isApiRequest
    ? request.clone({
        setHeaders: token && !isPublicAuthRequest ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      })
    : request;

  return next(apiRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && isApiRequest) {
        handleApiError(error, authTokenService, toastService, router, isPublicAuthRequest);
      }

      return throwError(() => error);
    }),
  );
};

function handleApiError(
  error: HttpErrorResponse,
  authTokenService: AuthTokenService,
  toastService: ToastService,
  router: Router,
  isPublicAuthRequest: boolean,
): void {
  if (error.status === 0) {
    toastService.error('网络连接异常，请确认后端服务已启动。');
    return;
  }

  if (error.status === 401) {
    authTokenService.clearToken();

    if (!isPublicAuthRequest && !router.url.startsWith('/login')) {
      toastService.warning('登录状态已过期，请重新登录。');
      void router.navigate(['/login']);
    }

    return;
  }

  if (error.status === 403) {
    toastService.warning(apiErrorMessage(error, '没有权限访问该资源。'));
    return;
  }

  if (error.status >= 500) {
    toastService.error(apiErrorMessage(error, '服务器暂时开小差了，请稍后再试。'));
  }
}

function apiErrorMessage(error: HttpErrorResponse, fallback: string): string {
  const body = error.error as { readonly message?: unknown } | string | null;

  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  if (body && typeof body === 'object' && typeof body.message === 'string' && body.message.trim()) {
    return body.message;
  }

  return fallback;
}
