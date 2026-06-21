import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Message } from '../../../core/models/message.model';
import { UserNotification } from '../../../core/models/notification.model';
import { MessageService } from '../../../core/services/message.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastService } from '../../../core/services/toast.service';

interface MessageFeedItem {
  readonly id: string;
  readonly rawId: number;
  readonly title: string;
  readonly body: string;
  readonly senderName: string;
  readonly targetUrl: string;
  readonly createdAt: string;
  readonly isRead: boolean;
  readonly source: 'message' | 'notification';
}

@Component({
  selector: 'app-message-list-page',
  imports: [RouterLink],
  templateUrl: './message-list.html',
  styleUrl: './message-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageListPage {
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);

  protected readonly feedItems = signal<readonly MessageFeedItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly unreadCount = computed(
    () => this.feedItems().filter((item) => !item.isRead).length,
  );

  constructor() {
    this.loadMessages();
  }

  protected markAllRead(): void {
    forkJoin({
      messages: this.messageService.markAllRead(),
      notifications: this.notificationService.markGroupRead('message'),
    }).subscribe({
      next: () => {
        this.feedItems.update((items) => items.map((item) => ({ ...item, isRead: true })));
        window.dispatchEvent(new Event('miracle-notifications-read'));
        this.toastService.success('消息已全部标记为已读。');
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '标记已读失败。'),
    });
  }

  protected openItem(event: Event, item: MessageFeedItem): void {
    event.preventDefault();

    const goTarget = () => void this.router.navigateByUrl(item.targetUrl);
    if (item.isRead) {
      goTarget();
      return;
    }

    this.feedItems.update((items) =>
      items.map((candidate) => (candidate.id === item.id ? { ...candidate, isRead: true } : candidate)),
    );
    window.dispatchEvent(new Event('miracle-notifications-read'));

    const handleError = (error: { readonly error?: { readonly message?: string } }) => {
      this.feedItems.update((items) =>
        items.map((candidate) => (candidate.id === item.id ? { ...candidate, isRead: false } : candidate)),
      );
      window.dispatchEvent(new Event('miracle-notifications-read'));
      this.toastService.error(error?.error?.message ?? '标记已读失败。');
    };

    if (item.source === 'message') {
      this.messageService.markRead(item.rawId).subscribe({ next: goTarget, error: handleError });
      return;
    }

    this.notificationService.markRead(item.rawId).subscribe({ next: goTarget, error: handleError });
  }

  private loadMessages(): void {
    this.isLoading.set(true);
    forkJoin({
      messages: this.messageService.listMessages(),
      notifications: this.notificationService.listNotifications(),
    }).subscribe({
      next: (response) => {
        const privateMessages = response.messages.data.map((message) =>
          this.toPrivateMessageItem(message),
        );
        const commentMessages = response.notifications.data
          .filter((notice) => notice.kind === 'message')
          .map((notice) => this.toNotificationMessageItem(notice));
        const feedItems = [...privateMessages, ...commentMessages].sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
        );

        this.feedItems.set(feedItems);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message ?? '消息加载失败。');
      },
    });
  }

  private toPrivateMessageItem(message: Message): MessageFeedItem {
    return {
      id: `message-${message.id}`,
      rawId: message.id,
      title: message.subject,
      body: message.body,
      senderName: message.sender?.username ?? '洞天成员',
      targetUrl: `/messages/${message.id}`,
      createdAt: message.sentAt,
      isRead: message.isRead,
      source: 'message',
    };
  }

  private toNotificationMessageItem(notice: UserNotification): MessageFeedItem {
    return {
      id: `notice-${notice.id}`,
      rawId: notice.id,
      title: notice.title,
      body: notice.body,
      senderName: notice.sender?.username ?? '学习小洞天',
      targetUrl: notice.targetUrl || '/notifications',
      createdAt: notice.createdAt,
      isRead: notice.isRead,
      source: 'notification',
    };
  }
}
