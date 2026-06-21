import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { API_BASE_URL } from '../services/api.config';
import { AuthTokenService } from '../services/auth-token.service';
import { ToastService } from '../services/toast.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authTokenService: AuthTokenService;
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };
  let toastService: {
    error: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    window.localStorage.clear();
    router = { url: '/messages', navigate: vi.fn() };
    toastService = {
      error: vi.fn(),
      warning: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toastService },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authTokenService = TestBed.inject(AuthTokenService);
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
  });

  it('adds Bearer token and credentials to API requests', () => {
    authTokenService.setToken('signed-token');

    http.get(`${API_BASE_URL}/messages`).subscribe();

    const request = httpMock.expectOne(`${API_BASE_URL}/messages`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer signed-token');
    expect(request.request.withCredentials).toBe(true);

    request.flush({ code: 200, message: 'ok', data: [] });
  });

  it('clears token and redirects to login on protected 401 responses', () => {
    authTokenService.setToken('expired-token');

    http.get(`${API_BASE_URL}/messages`).subscribe({
      error: () => undefined,
    });

    const request = httpMock.expectOne(`${API_BASE_URL}/messages`);
    request.flush(
      { code: 401, message: '未登录', data: null },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(authTokenService.getToken()).toBeNull();
    expect(toastService.warning).toHaveBeenCalledWith('登录状态已过期，请重新登录。');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
