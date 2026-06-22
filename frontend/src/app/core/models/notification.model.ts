import { User } from './user.model';

export type NotificationKind = 'reply' | 'comment' | 'mention' | 'like' | 'system' | 'message';

export interface UserNotification {
  readonly id: number;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly imageUrl?: string | null;
  readonly createdAt: string;
  readonly isRead: boolean;
  readonly targetUrl: string;
  readonly sender?: User | null;
  readonly type?: string;
}

export interface NotificationSummary {
  readonly mentions: number;
  readonly likes: number;
  readonly system: number;
  readonly messages: number;
  readonly total: number;
}

export interface Announcement {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  readonly imageUrl?: string | null;
  readonly createdAt: string;
  readonly sender?: User | null;
}
