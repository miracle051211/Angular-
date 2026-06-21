import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { User } from '../models/user.model';
import { API_BASE_URL, API_HTTP_OPTIONS } from './api.config';
import { AuthTokenService } from './auth-token.service';

export interface LoginPayload {
  readonly email: string;
  readonly password: string;
  readonly remember: boolean;
}

export interface RegisterPayload {
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly captcha?: string;
}

export interface SendCaptchaPayload {
  readonly email: string;
  readonly type: 'register' | 'reset';
}

export interface ResetPasswordPayload {
  readonly email: string;
  readonly captcha: string;
  readonly password: string;
}

interface AuthPayload {
  readonly user: User;
  readonly token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authTokenService = inject(AuthTokenService);
  private readonly currentUserState = signal<User | null>(null);

  readonly currentUser = this.currentUserState.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserState() !== null);

  loadCurrentUser(): void {
    this.me().subscribe({
      next: (response) => this.currentUserState.set(response.data),
      error: () => this.currentUserState.set(null),
    });
  }

  login(payload: LoginPayload): Observable<ApiResponse<User>> {
    return this.http
      .post<ApiResponse<AuthPayload>>(`${API_BASE_URL}/auth/login`, payload, API_HTTP_OPTIONS)
      .pipe(map((response) => this.handleAuthResponse(response)));
  }

  register(payload: RegisterPayload): Observable<ApiResponse<User>> {
    return this.http
      .post<ApiResponse<AuthPayload>>(`${API_BASE_URL}/auth/register`, payload, API_HTTP_OPTIONS)
      .pipe(map((response) => this.handleAuthResponse(response)));
  }

  sendCaptcha(payload: SendCaptchaPayload): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(
      `${API_BASE_URL}/auth/captcha`,
      payload,
      API_HTTP_OPTIONS,
    );
  }

  resetPassword(payload: ResetPasswordPayload): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(
      `${API_BASE_URL}/auth/reset-password`,
      payload,
      API_HTTP_OPTIONS,
    );
  }

  logout(): Observable<ApiResponse<null>> {
    return this.http
      .post<ApiResponse<null>>(`${API_BASE_URL}/auth/logout`, {}, API_HTTP_OPTIONS)
      .pipe(tap(() => this.clearSession()));
  }

  me(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${API_BASE_URL}/auth/me`, API_HTTP_OPTIONS);
  }

  setCurrentUser(user: User | null): void {
    this.currentUserState.set(user);
  }

  clearSession(): void {
    this.authTokenService.clearToken();
    this.currentUserState.set(null);
  }

  private handleAuthResponse(response: ApiResponse<AuthPayload>): ApiResponse<User> {
    this.authTokenService.setToken(response.data.token);
    this.currentUserState.set(response.data.user);
    return {
      ...response,
      data: response.data.user,
    };
  }
}
