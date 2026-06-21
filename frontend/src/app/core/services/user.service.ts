import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { PostSummary } from '../models/post.model';
import { User } from '../models/user.model';
import { API_BASE_URL, API_HTTP_OPTIONS } from './api.config';

export interface UserProfileStats {
  readonly posts: number;
  readonly reads: number;
  readonly comments: number;
}

export interface UserProfileResponse {
  readonly user: User;
  readonly stats: UserProfileStats;
  readonly posts: readonly PostSummary[];
}

export interface UpdateProfilePayload {
  readonly username: string;
  readonly signature: string;
  readonly gender?: 'male' | 'female' | 'secret' | '';
}

export interface UpdatePasswordPayload {
  readonly oldPassword: string;
  readonly newPassword: string;
}

export interface UserSettings {
  readonly notifyCommentReply: boolean;
  readonly notifyNewMessage: boolean;
  readonly notifyPostLike: boolean;
  readonly notifyCommentLike: boolean;
  readonly receiveEmailNotifications: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);

  searchUsers(search: string, limit = 8): Observable<ApiResponse<readonly User[]>> {
    return this.http.get<ApiResponse<readonly User[]>>(`${API_BASE_URL}/users`, {
      ...API_HTTP_OPTIONS,
      params: { search, limit },
    });
  }

  getProfile(userId: string): Observable<ApiResponse<UserProfileResponse>> {
    return this.http.get<ApiResponse<UserProfileResponse>>(
      `${API_BASE_URL}/users/${userId}/profile`,
      API_HTTP_OPTIONS,
    );
  }

  uploadAvatar(file: File): Observable<ApiResponse<User>> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post<ApiResponse<User>>(
      `${API_BASE_URL}/users/me/avatar`,
      formData,
      API_HTTP_OPTIONS,
    );
  }

  updateMyProfile(payload: UpdateProfilePayload): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(
      `${API_BASE_URL}/users/me/profile`,
      payload,
      API_HTTP_OPTIONS,
    );
  }

  updateMyPassword(payload: UpdatePasswordPayload): Observable<ApiResponse<null>> {
    return this.http.patch<ApiResponse<null>>(
      `${API_BASE_URL}/users/me/password`,
      payload,
      API_HTTP_OPTIONS,
    );
  }

  getMySettings(): Observable<ApiResponse<UserSettings>> {
    return this.http.get<ApiResponse<UserSettings>>(
      `${API_BASE_URL}/users/me/settings`,
      API_HTTP_OPTIONS,
    );
  }

  updateMySettings(payload: UserSettings): Observable<ApiResponse<UserSettings>> {
    return this.http.patch<ApiResponse<UserSettings>>(
      `${API_BASE_URL}/users/me/settings`,
      payload,
      API_HTTP_OPTIONS,
    );
  }

  listMyFollowing(): Observable<ApiResponse<readonly User[]>> {
    return this.http.get<ApiResponse<readonly User[]>>(
      `${API_BASE_URL}/users/me/following`,
      API_HTTP_OPTIONS,
    );
  }

  listFollowers(userId: string): Observable<ApiResponse<readonly User[]>> {
    return this.http.get<ApiResponse<readonly User[]>>(
      `${API_BASE_URL}/users/${userId}/followers`,
      API_HTTP_OPTIONS,
    );
  }

  followUser(userId: string): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(
      `${API_BASE_URL}/users/${userId}/follow`,
      {},
      API_HTTP_OPTIONS,
    );
  }

  unfollowUser(userId: string): Observable<ApiResponse<User | null>> {
    return this.http.delete<ApiResponse<User | null>>(
      `${API_BASE_URL}/users/${userId}/follow`,
      API_HTTP_OPTIONS,
    );
  }
}
