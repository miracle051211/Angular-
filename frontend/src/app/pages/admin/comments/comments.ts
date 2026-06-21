import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { AdminComment, AdminPage, AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-comments-page',
  templateUrl: './comments.html',
  styleUrl: './comments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCommentsPage {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  protected readonly comments = signal<readonly (AdminComment & { visible: boolean })[]>([]);
  protected readonly page = signal<AdminPage<AdminComment> | null>(null);

  constructor() {
    this.loadComments();
  }

  protected toggleVisible(commentId: number): void {
    const comment = this.comments().find((item) => item.id === commentId);
    if (!comment) {
      return;
    }

    this.adminService.setCommentActive(commentId, !comment.visible).subscribe({
      next: (response) => {
        this.comments.update((comments) =>
          comments.map((item) =>
            item.id === commentId ? { ...item, ...response.data, visible: response.data.isActive } : item,
          ),
        );
        this.toastService.success(response.data.isActive ? '评论已恢复显示。' : '评论已隐藏。');
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '评论状态更新失败，可能权限不足。'),
    });
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value.replace('T', ' ');
    }

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected goPage(page: number): void {
    const current = this.page();
    const maxPage = current?.pages ?? 1;
    if (page < 1 || page > maxPage || page === current?.page) {
      return;
    }
    this.loadComments(page);
  }

  protected pageNumbers(meta: AdminPage<unknown>): number[] {
    const total = Math.max(meta.pages || 1, 1);
    const current = Math.min(Math.max(meta.page, 1), total);
    const size = Math.min(total, 7);
    let start = Math.max(1, current - Math.floor(size / 2));
    const end = Math.min(total, start + size - 1);
    start = Math.max(1, end - size + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }
  private loadComments(page = 1): void {
    this.adminService.listComments(page).subscribe({
      next: (response) => {
        this.page.set(response.data);
        this.comments.set(response.data.items.map((comment) => ({ ...comment, visible: comment.isActive })));
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '评论列表加载失败。'),
    });
  }
}

