import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { Announcement, NotificationSummary, UserNotification } from '../models/notification.model';
import { API_BASE_URL, API_HTTP_OPTIONS } from './api.config';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);

  listNotifications(): Observable<ApiResponse<readonly UserNotification[]>> {
    return this.http.get<ApiResponse<readonly UserNotification[]>>(
      `${API_BASE_URL}/notifications`,
      API_HTTP_OPTIONS,
    );
  }

  getSummary(): Observable<ApiResponse<NotificationSummary>> {
    return this.http.get<ApiResponse<NotificationSummary>>(
      `${API_BASE_URL}/notifications/summary`,
      API_HTTP_OPTIONS,
    );
  }

  listAnnouncements(limit = 3): Observable<ApiResponse<readonly Announcement[]>> {
    return this.http.get<ApiResponse<readonly Announcement[]>>(
      `${API_BASE_URL}/notifications/announcements`,
      {
        ...API_HTTP_OPTIONS,
        params: { limit },
      },
    );
  }

  markAllRead(): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(
      `${API_BASE_URL}/notifications/read-all`,
      {},
      API_HTTP_OPTIONS,
    );
  }

  markRead(id: number): Observable<ApiResponse<UserNotification>> {
    return this.http.post<ApiResponse<UserNotification>>(
      `${API_BASE_URL}/notifications/${id}/read`,
      {},
      API_HTTP_OPTIONS,
    );
  }

  markGroupRead(group: NotificationSummaryKey): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(
      `${API_BASE_URL}/notifications/read-group/${group}`,
      {},
      API_HTTP_OPTIONS,
    );
  }

  deleteNotification(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${API_BASE_URL}/notifications/${id}`,
      API_HTTP_OPTIONS,
    );
  }

  deleteAll(): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${API_BASE_URL}/notifications`,
      API_HTTP_OPTIONS,
    );
  }
}

export type NotificationSummaryKey = 'mention' | 'like' | 'system' | 'message';
