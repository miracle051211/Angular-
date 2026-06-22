import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { NotificationKind, UserNotification } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { MessageListPage } from '../messages/message-list/message-list';

interface NoticeTab {
  readonly id: NotificationKind;
  readonly label: string;
  readonly empty: string;
}

@Component({
  selector: 'app-notifications-page',
  imports: [RouterLink, MessageListPage],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);

  protected readonly tabs: readonly NoticeTab[] = [
    { id: 'message', label: '我的消息', empty: '私信和消息提醒会在这里显示。' },
    { id: 'mention', label: '@我的', empty: '还没有人提到你。' },
    { id: 'like', label: '收到的赞', empty: '暂时还没有新的点赞。' },
    { id: 'system', label: '系统通知', empty: '系统通知很安静。' },
  ];
  protected readonly notifications = signal<readonly UserNotification[]>([]);
  protected readonly activeTab = signal<NotificationKind>('message');
  protected readonly isLoading = signal(true);
  protected readonly isClearing = signal(false);
  protected readonly deletingIds = signal<Record<number, boolean>>({});
  protected readonly unreadCount = computed(() => this.notifications().filter((item) => !item.isRead).length);
  protected readonly filteredNotifications = computed(() =>
    this.notifications().filter((item) => item.kind === this.activeTab()),
  );

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab') as NotificationKind | null;
      if (tab && this.tabs.some((item) => item.id === tab)) {
        this.activeTab.set(tab);
      }
    });
    this.loadNotifications();
  }

  protected selectTab(tab: NotificationKind): void {
    this.activeTab.set(tab);
    const userId = this.route.snapshot.queryParamMap.get('userId');
    void this.router.navigate(['/notifications'], {
      queryParams: tab === 'message' && userId ? { tab, userId } : { tab },
    });
  }

  protected tabCount(tab: NotificationKind): number {
    return this.notifications().filter((item) => item.kind === tab && !item.isRead).length;
  }

  protected activeTabLabel(): string {
    return this.tabs.find((tab) => tab.id === this.activeTab())?.label ?? '消息中心';
  }

  protected activeEmptyText(): string {
    return this.tabs.find((tab) => tab.id === this.activeTab())?.empty ?? '这里暂时没有消息。';
  }


  protected formatNoticeTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }
  protected markAllRead(): void {
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.notifications.update((items) => items.map((item) => ({ ...item, isRead: true })));
        window.dispatchEvent(new Event('miracle-notifications-read'));
        this.toastService.success('通知已全部标记为已读。');
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '标记已读失败。'),
    });
  }

  protected clearAll(): void {
    if (this.isClearing() || this.notifications().length === 0) {
      return;
    }

    this.isClearing.set(true);
    this.notificationService.deleteAll().subscribe({
      next: () => {
        this.notifications.set([]);
        this.isClearing.set(false);
        window.dispatchEvent(new Event('miracle-notifications-read'));
        this.toastService.success('通知已清空。');
      },
      error: (error) => {
        this.isClearing.set(false);
        this.toastService.error(error?.error?.message ?? '清空通知失败。');
      },
    });
  }

  protected deleteNotification(event: Event, notice: UserNotification): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.deletingIds()[notice.id]) {
      return;
    }

    this.deletingIds.update((items) => ({ ...items, [notice.id]: true }));
    this.notificationService.deleteNotification(notice.id).subscribe({
      next: () => {
        this.notifications.update((items) => items.filter((item) => item.id !== notice.id));
        this.clearDeletingId(notice.id);
        window.dispatchEvent(new Event('miracle-notifications-read'));
        this.toastService.success('通知已删除。');
      },
      error: (error) => {
        this.clearDeletingId(notice.id);
        this.toastService.error(error?.error?.message ?? '删除通知失败。');
      },
    });
  }

  protected openNotification(event: Event, notice: UserNotification): void {
    event.preventDefault();

    const goTarget = () => void this.router.navigateByUrl(notice.targetUrl || '/notifications');

    if (notice.isRead) {
      goTarget();
      return;
    }

    this.notifications.update((items) =>
      items.map((item) => (item.id === notice.id ? { ...item, isRead: true } : item)),
    );
    window.dispatchEvent(new Event('miracle-notifications-read'));

    this.notificationService.markRead(notice.id).subscribe({
      next: goTarget,
      error: (error) => {
        this.notifications.update((items) =>
          items.map((item) => (item.id === notice.id ? { ...item, isRead: false } : item)),
        );
        window.dispatchEvent(new Event('miracle-notifications-read'));
        this.toastService.error(error?.error?.message ?? '标记已读失败。');
      },
    });
  }

  private loadNotifications(): void {
    this.isLoading.set(true);
    this.notificationService.listNotifications().subscribe({
      next: (response) => {
        this.notifications.set(response.data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message ?? '通知加载失败。');
      },
    });
  }

  private clearDeletingId(id: number): void {
    this.deletingIds.update((items) => {
      const next = { ...items };
      delete next[id];
      return next;
    });
  }
}

