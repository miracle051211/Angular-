import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { Board } from '../models/board.model';
import { CommentThread } from '../models/comment.model';
import { PostDetail, PostImage, PostPayload, PostSummary } from '../models/post.model';
import { API_BASE_URL, API_HTTP_OPTIONS } from './api.config';

export interface PaginatedPosts {
  readonly items: readonly PostSummary[];
  readonly page: number;
  readonly perPage: number;
  readonly total: number;
  readonly pages: number;
}

export interface PostListParams {
  readonly page?: number;
  readonly perPage?: number;
  readonly boardId?: number;
  readonly search?: string;
  readonly hot?: boolean;
  readonly mine?: boolean;
}

export interface ForumStatsResponse {
  readonly posts: number;
  readonly users: number;
  readonly comments: number;
  readonly boards: number;
}

export interface LikeStateResponse {
  readonly liked: boolean;
  readonly count: number;
}

export type PostAiAssistMode = 'inspiration' | 'continue' | 'structure' | 'polish';

export interface PostAiAssistResponse {
  readonly text: string;
  readonly model?: string;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class PostService {
  private readonly http = inject(HttpClient);

  listPosts(params: PostListParams = {}): Observable<ApiResponse<PaginatedPosts>> {
    const queryParams: Record<string, string | number> = {};

    if (params.page) {
      queryParams['page'] = params.page;
    }
    if (params.perPage) {
      queryParams['perPage'] = params.perPage;
    }
    if (params.boardId) {
      queryParams['boardId'] = params.boardId;
    }
    if (params.search) {
      queryParams['search'] = params.search;
    }
    if (params.hot) {
      queryParams['hot'] = 1;
    }
    if (params.mine) {
      queryParams['mine'] = 1;
    }

    return this.http.get<ApiResponse<PaginatedPosts>>(`${API_BASE_URL}/posts`, {
      ...API_HTTP_OPTIONS,
      params: queryParams,
    });
  }

  listBoards(): Observable<ApiResponse<readonly Board[]>> {
    return this.http.get<ApiResponse<readonly Board[]>>(`${API_BASE_URL}/boards`, API_HTTP_OPTIONS);
  }

  getStats(): Observable<ApiResponse<ForumStatsResponse>> {
    return this.http.get<ApiResponse<ForumStatsResponse>>(`${API_BASE_URL}/stats`, API_HTTP_OPTIONS);
  }

  getPost(id: number): Observable<ApiResponse<PostDetail>> {
    return this.http.get<ApiResponse<PostDetail>>(`${API_BASE_URL}/posts/${id}`, API_HTTP_OPTIONS);
  }

  createPost(payload: PostPayload): Observable<ApiResponse<PostDetail>> {
    return this.http.post<ApiResponse<PostDetail>>(`${API_BASE_URL}/posts`, payload, API_HTTP_OPTIONS);
  }

  assistPost(payload: {
    readonly mode: PostAiAssistMode;
    readonly title: string;
    readonly content: string;
  }): Observable<ApiResponse<PostAiAssistResponse>> {
    return this.http.post<ApiResponse<PostAiAssistResponse>>(
      `${API_BASE_URL}/posts/ai-assist`,
      payload,
      API_HTTP_OPTIONS,
    );
  }

  uploadPostImages(postId: number, images: readonly File[]): Observable<ApiResponse<readonly PostImage[]>> {
    const formData = new FormData();
    images.forEach((image) => formData.append('images', image));

    return this.http.post<ApiResponse<readonly PostImage[]>>(
      `${API_BASE_URL}/posts/${postId}/images`,
      formData,
      { withCredentials: true },
    );
  }

  updatePost(id: number, payload: PostPayload): Observable<ApiResponse<PostDetail>> {
    return this.http.put<ApiResponse<PostDetail>>(`${API_BASE_URL}/posts/${id}`, payload, API_HTTP_OPTIONS);
  }

  deletePost(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${API_BASE_URL}/posts/${id}`, API_HTTP_OPTIONS);
  }

  listComments(postId: number): Observable<ApiResponse<readonly CommentThread[]>> {
    return this.http.get<ApiResponse<readonly CommentThread[]>>(
      `${API_BASE_URL}/posts/${postId}/comments`,
      API_HTTP_OPTIONS,
    );
  }

  createComment(postId: number, content: string, parentId?: number): Observable<ApiResponse<CommentThread>> {
    return this.http.post<ApiResponse<CommentThread>>(
      `${API_BASE_URL}/posts/${postId}/comments`,
      { content, parentId },
      API_HTTP_OPTIONS,
    );
  }

  togglePostLike(postId: number): Observable<ApiResponse<LikeStateResponse>> {
    return this.http.post<ApiResponse<LikeStateResponse>>(
      `${API_BASE_URL}/posts/${postId}/like`,
      {},
      API_HTTP_OPTIONS,
    );
  }

  reportPost(postId: number, reason: string): Observable<ApiResponse<{ readonly reported: boolean }>> {
    return this.http.post<ApiResponse<{ readonly reported: boolean }>>(
      `${API_BASE_URL}/posts/${postId}/report`,
      { reason },
      API_HTTP_OPTIONS,
    );
  }

  toggleCommentLike(postId: number, commentId: number): Observable<ApiResponse<LikeStateResponse>> {
    return this.http.post<ApiResponse<LikeStateResponse>>(
      `${API_BASE_URL}/posts/${postId}/comments/${commentId}/like`,
      {},
      API_HTTP_OPTIONS,
    );
  }

  reportComment(
    postId: number,
    commentId: number,
    reason: string,
  ): Observable<ApiResponse<{ readonly reported: boolean }>> {
    return this.http.post<ApiResponse<{ readonly reported: boolean }>>(
      `${API_BASE_URL}/posts/${postId}/comments/${commentId}/report`,
      { reason },
      API_HTTP_OPTIONS,
    );
  }
}
