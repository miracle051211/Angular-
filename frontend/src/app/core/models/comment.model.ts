import { User } from './user.model';

export interface CommentThread {
  readonly id: number;
  readonly postId: number;
  readonly author: User;
  readonly content: string;
  readonly createdAt: string;
  readonly likeCount: number;
  readonly isLiked?: boolean;
  readonly replies: readonly CommentReply[];
}

export interface CommentReply {
  readonly id: number;
  readonly author: User;
  readonly content: string;
  readonly createdAt: string;
  readonly likeCount?: number;
  readonly isLiked?: boolean;
}
