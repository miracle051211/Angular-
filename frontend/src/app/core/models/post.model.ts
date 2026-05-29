import { Board } from './board.model';
import { User } from './user.model';

export interface PostSummary {
  readonly id: number;
  readonly title: string;
  readonly excerpt: string;
  readonly readCount: number;
  readonly commentCount: number;
  readonly createdAt: string;
  readonly board: Board;
  readonly author: User;
}

export interface PostDetail extends PostSummary {
  readonly content: string;
}

export interface PostPayload {
  readonly title: string;
  readonly content: string;
  readonly boardId: number;
}
