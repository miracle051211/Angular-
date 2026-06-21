import { Board } from './board.model';
import { CommentThread } from './comment.model';
import { User } from './user.model';

export interface PostSummary {
  readonly id: number;
  readonly title: string;
  readonly excerpt: string;
  readonly readCount: number;
  readonly commentCount: number;
  readonly likeCount?: number;
  readonly isLiked?: boolean;
  readonly createdAt: string;
  readonly board: Board;
  readonly author: User;
  readonly images?: readonly PostImage[];
}

export interface PostDetail extends PostSummary {
  readonly content: string;
  readonly images?: readonly PostImage[];
  readonly comments?: readonly CommentThread[];
}

export interface PostImage {
  readonly id: number;
  readonly url: string;
  readonly originalName?: string | null;
}

export interface PostPayload {
  readonly title: string;
  readonly content: string;
  readonly boardId: number;
}
