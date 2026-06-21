import { Injectable } from '@angular/core';

const AUTH_TOKEN_KEY = 'new_miracle_access_token';
const LEGACY_AUTH_TOKEN_KEY = 'miracle_access_token';

@Injectable({
  providedIn: 'root',
})
export class AuthTokenService {
  getToken(): string | null {
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  }

  setToken(token: string): void {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  clearToken(): void {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  }
}
