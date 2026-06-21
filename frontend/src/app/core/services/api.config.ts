import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;

export const API_HTTP_OPTIONS = {
  withCredentials: true,
} as const;
