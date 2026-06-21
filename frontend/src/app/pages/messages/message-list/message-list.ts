import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';

import { Message, MessageConversation } from '../../../core/models/message.model';
import { UserNotification } from '../../../core/models/notification.model';
import { User } from '../../../core/models/user.model';
import { API_ORIGIN } from '../../../core/services/api.config';
import { AuthService } from '../../../core/services/auth.service';
import { MessageService } from '../../../core/services/message.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';

interface NoticeFeedItem {
  readonly id: string;
  readonly rawId: number;
  readonly title: string;
  readonly body: string;
  readonly senderName: string;
  readonly targetUrl: string;
  readonly createdAt: string;
  readonly isRead: boolean;
}

@Component({
  selector: 'app-message-list-page',
  imports: [ReactiveFormsModule, RouterLink, SlicePipe],
  templateUrl: './message-list.html',
  styleUrl: './message-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageListPage {
  private readonly apiOrigin = API_ORIGIN;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly notificationService = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);

  readonly embedded = input(false);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly conversations = signal<readonly MessageConversation[]>([]);
  protected readonly notices = signal<readonly NoticeFeedItem[]>([]);
  protected readonly activePartner = signal<User | null>(null);
  protected readonly activeMessages = signal<readonly Message[]>([]);
  protected readonly searchResults = signal<readonly User[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isThreadLoading = signal(false);
  protected readonly isSearching = signal(false);
  protected readonly isSending = signal(false);
  protected readonly composer = new FormControl('', { nonNullable: true });
  protected readonly search = new FormControl('', { nonNullable: true });

  protected readonly unreadCount = computed(
    () => this.conversations().reduce((sum, item) => sum + item.unreadCount, 0) + this.notices().filter((item) => !item.isRead).length,
  );
  protected readonly activePartnerId = computed(() => this.activePartner()?.id ?? null);

  constructor() {
    this.loadInbox();
    this.bindSearch();
  }

  protected selectConversation(conversation: MessageConversation): void {
    this.openConversation(conversation.partner);
  }

  protected startConversation(user: User): void {
    this.search.setValue('', { emitEvent: false });
    this.searchResults.set([]);
    this.openConversation(user);
  }

  protected sendMessage(): void {
    const partner = this.activePartner();
    const content = this.composer.value.trim();

    if (!partner) {
      this.toastService.warning('请先选择聊天对象');
      return;
    }

    if (!content) {
      this.toastService.warning('私信内容不能为空');
      return;
    }

    this.isSending.set(true);
    this.messageService.sendMessage({ receiverId: partner.id, content }).subscribe({
      next: (response) => {
        this.activeMessages.update((messages) => [...messages, response.data]);
        this.composer.setValue('');
        this.isSending.set(false);
        this.refreshConversations(partner.id);
        window.dispatchEvent(new Event('miracle-notifications-read'));
      },
      error: (error) => {
        this.isSending.set(false);
        this.toastService.error(error?.error?.message ?? '操作失败，请稍后再试');
      },
    });
  }

  protected markAllRead(): void {
    forkJoin({
      messages: this.messageService.markAllRead(),
      notifications: this.notificationService.markGroupRead('message'),
    }).subscribe({
      next: () => {
        this.conversations.update((items) => items.map((item) => ({ ...item, unreadCount: 0 })));
        this.notices.update((items) => items.map((item) => ({ ...item, isRead: true })));
        window.dispatchEvent(new Event('miracle-notifications-read'));
        this.toastService.success('已把私信和消息提醒标记为已读');
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '操作失败，请稍后再试'),
    });
  }

  protected openNotice(event: Event, item: NoticeFeedItem): void {
    event.preventDefault();
    const goTarget = () => void this.router.navigateByUrl(item.targetUrl);
    if (item.isRead) {
      goTarget();
      return;
    }

    this.notices.update((items) => items.map((candidate) => (candidate.id === item.id ? { ...candidate, isRead: true } : candidate)));
    this.notificationService.markRead(item.rawId).subscribe({
      next: goTarget,
      error: (error) => {
        this.notices.update((items) => items.map((candidate) => (candidate.id === item.id ? { ...candidate, isRead: false } : candidate)));
        this.toastService.error(error?.error?.message ?? '操作失败，请稍后再试');
      },
    });
  }

  protected avatarSrc(value: string | null | undefined, username = '同学'): string {
    if (value) {
      return value.startsWith('http') ? value : `${this.apiOrigin}${value}`;
    }
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`;
  }

  protected messageBody(message: Message): string {
    return message.content ?? message.body;
  }

  protected trackConversation(_: number, item: MessageConversation): string {
    return item.partner.id;
  }

  protected trackMessage(_: number, item: Message): number {
    return item.id;
  }

  private loadInbox(): void {
    this.isLoading.set(true);
    forkJoin({
      conversations: this.messageService.listConversations(),
      notifications: this.notificationService.listNotifications(),
    }).subscribe({
      next: (response) => {
        const conversations = response.conversations.data;
        this.conversations.set(conversations);
        this.notices.set(
          response.notifications.data
            .filter((notice) => notice.kind === 'message')
            .map((notice) => this.toNoticeFeedItem(notice)),
        );
        this.isLoading.set(false);
        const targetUserId = this.route.snapshot.queryParamMap.get('userId');
        const targetConversation = targetUserId
          ? conversations.find((conversation) => conversation.partner.id === targetUserId)
          : null;

        if (targetConversation) {
          this.openConversation(targetConversation.partner);
        } else if (conversations.length > 0 && !this.activePartner()) {
          this.openConversation(conversations[0].partner);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message ?? '操作失败，请稍后再试');
      },
    });
  }

  private refreshConversations(selectUserId?: string): void {
    this.messageService.listConversations().subscribe({
      next: (response) => {
        this.conversations.set(response.data);
        if (selectUserId) {
          const partner = response.data.find((item) => item.partner.id === selectUserId)?.partner;
          if (partner) {
            this.activePartner.set(partner);
          }
        }
      },
    });
  }

  private openConversation(partner: User): void {
    this.activePartner.set(partner);
    this.isThreadLoading.set(true);
    this.messageService.getConversation(partner.id).subscribe({
      next: (response) => {
        this.activePartner.set(response.data.partner);
        this.activeMessages.set(response.data.messages);
        this.isThreadLoading.set(false);
        this.conversations.update((items) =>
          items.map((item) => (item.partner.id === partner.id ? { ...item, unreadCount: 0 } : item)),
        );
        window.dispatchEvent(new Event('miracle-notifications-read'));
      },
      error: (error) => {
        this.isThreadLoading.set(false);
        this.toastService.error(error?.error?.message ?? '操作失败，请稍后再试');
      },
    });
  }

  private bindSearch(): void {
    this.search.valueChanges
      .pipe(
        debounceTime(240),
        map((value) => value.trim()),
        distinctUntilChanged(),
        switchMap((keyword) => {
          if (!keyword) {
            this.isSearching.set(false);
            return of([] as readonly User[]);
          }
          this.isSearching.set(true);
          return this.userService.searchUsers(keyword, 8).pipe(
            map((response) => response.data.filter((user) => user.id !== this.currentUser()?.id)),
            catchError(() => of([] as readonly User[])),
          );
        }),
      )
      .subscribe((users) => {
        this.searchResults.set(users);
        this.isSearching.set(false);
      });
  }

  private toNoticeFeedItem(notice: UserNotification): NoticeFeedItem {
    return {
      id: `notice-${notice.id}`,
      rawId: notice.id,
      title: notice.title,
      body: notice.body,
      senderName: notice.sender?.username ?? '系统提醒',
      targetUrl: notice.targetUrl || '/notifications',
      createdAt: notice.createdAt,
      isRead: notice.isRead,
    };
  }
}
