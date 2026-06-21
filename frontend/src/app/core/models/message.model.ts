import { User } from './user.model';

export interface Message {
  readonly id: number;
  readonly subject: string;
  readonly body: string;
  readonly sender: User;
  readonly receiver: User;
  readonly sentAt: string;
  readonly isRead: boolean;
}
