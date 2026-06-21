import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { ConversationDetail, Message, MessageConversation, SendMessagePayload } from '../models/message.model';
import { API_BASE_URL, API_HTTP_OPTIONS } from './api.config';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private readonly http = inject(HttpClient);

  listMessages(): Observable<ApiResponse<readonly Message[]>> {
    return this.http.get<ApiResponse<readonly Message[]>>(`${API_BASE_URL}/messages`, API_HTTP_OPTIONS);
  }

  listConversations(): Observable<ApiResponse<readonly MessageConversation[]>> {
    return this.http.get<ApiResponse<readonly MessageConversation[]>>(
      `${API_BASE_URL}/messages/conversations`,
      API_HTTP_OPTIONS,
    );
  }

  getConversation(userId: string): Observable<ApiResponse<ConversationDetail>> {
    return this.http.get<ApiResponse<ConversationDetail>>(
      `${API_BASE_URL}/messages/conversations/${userId}`,
      API_HTTP_OPTIONS,
    );
  }

  sendMessage(payload: SendMessagePayload): Observable<ApiResponse<Message>> {
    return this.http.post<ApiResponse<Message>>(`${API_BASE_URL}/messages`, payload, API_HTTP_OPTIONS);
  }

  getMessage(id: number): Observable<ApiResponse<Message>> {
    return this.http.get<ApiResponse<Message>>(`${API_BASE_URL}/messages/${id}`, API_HTTP_OPTIONS);
  }

  getSummary(): Observable<ApiResponse<{ readonly unread: number }>> {
    return this.http.get<ApiResponse<{ readonly unread: number }>>(
      `${API_BASE_URL}/messages/summary`,
      API_HTTP_OPTIONS,
    );
  }

  markAllRead(): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(
      `${API_BASE_URL}/messages/read-all`,
      {},
      API_HTTP_OPTIONS,
    );
  }

  markRead(id: number): Observable<ApiResponse<Message>> {
    return this.http.post<ApiResponse<Message>>(
      `${API_BASE_URL}/messages/${id}/read`,
      {},
      API_HTTP_OPTIONS,
    );
  }
}
