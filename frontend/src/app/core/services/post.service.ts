import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { PostDetail, PostPayload, PostSummary } from '../models/post.model';

const API_BASE_URL = 'http://localhost:5000/api';

@Injectable({
  providedIn: 'root',
})
export class PostService {
  private readonly http = inject(HttpClient);

  listPosts(): Observable<ApiResponse<readonly PostSummary[]>> {
    return this.http.get<ApiResponse<readonly PostSummary[]>>(`${API_BASE_URL}/posts`);
  }

  getPost(id: number): Observable<ApiResponse<PostDetail>> {
    return this.http.get<ApiResponse<PostDetail>>(`${API_BASE_URL}/posts/${id}`);
  }

  createPost(payload: PostPayload): Observable<ApiResponse<PostDetail>> {
    return this.http.post<ApiResponse<PostDetail>>(`${API_BASE_URL}/posts`, payload);
  }

  updatePost(id: number, payload: PostPayload): Observable<ApiResponse<PostDetail>> {
    return this.http.put<ApiResponse<PostDetail>>(`${API_BASE_URL}/posts/${id}`, payload);
  }

  deletePost(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${API_BASE_URL}/posts/${id}`);
  }
}
