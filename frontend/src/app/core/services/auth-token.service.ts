import { Injectable } from '@angular/core';

const AUTH_TOKEN_KEY = 'miracle_access_token';

@Injectable({
  providedIn: 'root',
})
export class AuthTokenService {
  getToken(): string | null {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  }

  setToken(token: string): void {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  clearToken(): void {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}
