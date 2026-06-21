import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { Board } from '../models/board.model';
import { User } from '../models/user.model';
import { API_BASE_URL, API_HTTP_OPTIONS } from './api.config';

export interface AdminStats {
  readonly users: number;
  readonly posts: number;
  readonly comments: number;
  readonly reports: number;
}

export interface AdminDashboard {
  readonly stats: AdminStats;
  readonly recentPosts: readonly AdminPost[];
}

export interface AdminPage<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly perPage: number;
  readonly total: number;
  readonly pages: number;
}

export interface AdminPost {
  readonly id: number;
  readonly title: string;
  readonly readCount: number;
  readonly commentCount: number;
  readonly createdAt: string;
  readonly isActive: boolean;
  readonly board: Board;
  readonly author: User;
}

export interface AdminComment {
  readonly id: number;
  readonly postId: number;
  readonly postTitle: string;
  readonly content: string;
  readonly createdAt: string;
  readonly likeCount: number;
  readonly isActive: boolean;
  readonly author: User | null;
}

export interface AdminBoard extends Board {
  readonly isActive: boolean;
  readonly createdAt: string;
}

export type AdminReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface AdminReport {
  readonly id: number;
  readonly targetId: number;
  readonly targetType: 'post' | 'comment';
  readonly targetTitle: string;
  readonly reason: string;
  readonly reporter: string;
  readonly createdAt: string;
  readonly status: AdminReportStatus;
}

export interface AdminAnnouncement {
  readonly id: number;
  readonly content: string;
  readonly createdAt: string;
  readonly receiverCount: number;
  readonly sender: User | null;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<ApiResponse<AdminDashboard>> {
    return this.http.get<ApiResponse<AdminDashboard>>(`${API_BASE_URL}/admin/dashboard`, API_HTTP_OPTIONS);
  }

  listUsers(): Observable<ApiResponse<readonly User[]>> {
    return this.http.get<ApiResponse<readonly User[]>>(`${API_BASE_URL}/admin/users`, API_HTTP_OPTIONS);
  }

  setUserActive(userId: string, isActive: boolean): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(
      `${API_BASE_URL}/admin/users/${userId}/active`,
      { isActive },
      API_HTTP_OPTIONS,
    );
  }

  listStaff(): Observable<ApiResponse<readonly User[]>> {
    return this.http.get<ApiResponse<readonly User[]>>(`${API_BASE_URL}/admin/staff`, API_HTTP_OPTIONS);
  }

  createStaff(payload: { username: string; email: string; password: string; roleName: string }): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${API_BASE_URL}/admin/staff`, payload, API_HTTP_OPTIONS);
  }

  updateStaffRole(userId: string, roleName: string): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(
      `${API_BASE_URL}/admin/staff/${userId}`,
      { roleName },
      API_HTTP_OPTIONS,
    );
  }

  listPosts(page = 1, perPage = 20): Observable<ApiResponse<AdminPage<AdminPost>>> {
    return this.http.get<ApiResponse<AdminPage<AdminPost>>>(`${API_BASE_URL}/admin/posts`, {
      ...API_HTTP_OPTIONS,
      params: { page, perPage },
    });
  }
  setPostActive(postId: number, isActive: boolean): Observable<ApiResponse<AdminPost>> {
    return this.http.patch<ApiResponse<AdminPost>>(
      `${API_BASE_URL}/admin/posts/${postId}/active`,
      { isActive },
      API_HTTP_OPTIONS,
    );
  }

  deletePost(postId: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${API_BASE_URL}/admin/posts/${postId}`,
      API_HTTP_OPTIONS,
    );
  }

  listComments(page = 1, perPage = 20): Observable<ApiResponse<AdminPage<AdminComment>>> {
    return this.http.get<ApiResponse<AdminPage<AdminComment>>>(`${API_BASE_URL}/admin/comments`, {
      ...API_HTTP_OPTIONS,
      params: { page, perPage },
    });
  }
  setCommentActive(commentId: number, isActive: boolean): Observable<ApiResponse<AdminComment>> {
    return this.http.patch<ApiResponse<AdminComment>>(
      `${API_BASE_URL}/admin/comments/${commentId}/active`,
      { isActive },
      API_HTTP_OPTIONS,
    );
  }

  deleteComment(commentId: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${API_BASE_URL}/admin/comments/${commentId}`,
      API_HTTP_OPTIONS,
    );
  }

  listBoards(): Observable<ApiResponse<readonly AdminBoard[]>> {
    return this.http.get<ApiResponse<readonly AdminBoard[]>>(`${API_BASE_URL}/admin/boards`, API_HTTP_OPTIONS);
  }

  createBoard(name: string): Observable<ApiResponse<AdminBoard>> {
    return this.http.post<ApiResponse<AdminBoard>>(
      `${API_BASE_URL}/admin/boards`,
      { name },
      API_HTTP_OPTIONS,
    );
  }

  setBoardActive(boardId: number, isActive: boolean): Observable<ApiResponse<AdminBoard>> {
    return this.http.patch<ApiResponse<AdminBoard>>(
      `${API_BASE_URL}/admin/boards/${boardId}/active`,
      { isActive },
      API_HTTP_OPTIONS,
    );
  }

  listReports(page = 1, perPage = 20): Observable<ApiResponse<AdminPage<AdminReport>>> {
    return this.http.get<ApiResponse<AdminPage<AdminReport>>>(`${API_BASE_URL}/admin/reports`, {
      ...API_HTTP_OPTIONS,
      params: { page, perPage },
    });
  }
  setReportStatus(reportId: number, status: AdminReportStatus): Observable<ApiResponse<AdminReport>> {
    return this.http.patch<ApiResponse<AdminReport>>(
      `${API_BASE_URL}/admin/reports/${reportId}`,
      { status },
      API_HTTP_OPTIONS,
    );
  }

  listAnnouncements(): Observable<ApiResponse<readonly AdminAnnouncement[]>> {
    return this.http.get<ApiResponse<readonly AdminAnnouncement[]>>(
      `${API_BASE_URL}/admin/announcements`,
      API_HTTP_OPTIONS,
    );
  }

  createAnnouncement(content: string): Observable<ApiResponse<AdminAnnouncement>> {
    return this.http.post<ApiResponse<AdminAnnouncement>>(
      `${API_BASE_URL}/admin/announcements`,
      { content },
      API_HTTP_OPTIONS,
    );
  }

  deleteAnnouncement(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${API_BASE_URL}/admin/announcements/${id}`,
      API_HTTP_OPTIONS,
    );
  }
}



