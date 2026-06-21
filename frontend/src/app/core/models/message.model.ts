import { User } from './user.model';

export interface Message {
  readonly id: number;
  readonly subject: string;
  readonly body: string;
  readonly content?: string;
  readonly sender: User;
  readonly receiver: User;
  readonly sentAt: string;
  readonly isRead: boolean;
  readonly isMine?: boolean;
}

export interface MessageConversation {
  readonly partner: User;
  readonly latestMessage: Message;
  readonly unreadCount: number;
}

export interface ConversationDetail {
  readonly partner: User;
  readonly messages: readonly Message[];
}

export interface SendMessagePayload {
  readonly receiverId?: string;
  readonly receiver?: string;
  readonly content: string;
}
