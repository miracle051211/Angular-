import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminPage, AdminPost, AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-posts-page',
  imports: [RouterLink],
  templateUrl: './posts.html',
  styleUrl: './posts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPostsPage {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  protected readonly posts = signal<readonly (AdminPost & { visible: boolean })[]>([]);
  protected readonly page = signal<AdminPage<AdminPost> | null>(null);
  protected readonly deletingId = signal<number | null>(null);

  constructor() {
    this.loadPosts();
  }

  protected toggleVisible(postId: number): void {
    const post = this.posts().find((item) => item.id === postId);
    if (!post) {
      return;
    }

    this.adminService.setPostActive(postId, !post.visible).subscribe({
      next: (response) => {
        this.posts.update((posts) =>
          posts.map((item) =>
            item.id === postId ? { ...item, ...response.data, visible: response.data.isActive } : item,
          ),
        );
        this.toastService.success(response.data.isActive ? '帖子已恢复显示。' : '帖子已隐藏。');
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '帖子状态更新失败，可能权限不足。'),
    });
  }

  protected deletePost(post: AdminPost): void {
    if (this.deletingId()) {
      return;
    }

    const confirmed = window.confirm(`确定要从数据库删除《${post.title}》吗？这个操作不可恢复。`);
    if (!confirmed) {
      return;
    }

    this.deletingId.set(post.id);
    this.adminService.deletePost(post.id).subscribe({
      next: () => {
        this.posts.update((posts) => posts.filter((item) => item.id !== post.id));
        const current = this.page();
        if (current) {
          this.page.set({ ...current, total: Math.max(0, current.total - 1) });
        }
        this.deletingId.set(null);
        this.toastService.success('帖子已从数据库删除。');
      },
      error: (error) => {
        this.deletingId.set(null);
        this.toastService.error(error?.error?.message ?? '删除失败，可能权限不足。');
      },
    });
  }

  protected goPage(page: number): void {
    const current = this.page();
    const maxPage = current?.pages ?? 1;
    if (page < 1 || page > maxPage || page === current?.page) {
      return;
    }
    this.loadPosts(page);
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
  private loadPosts(page = 1): void {
    this.adminService.listPosts(page).subscribe({
      next: (response) => {
        this.page.set(response.data);
        this.posts.set(response.data.items.map((post) => ({ ...post, visible: post.isActive })));
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '帖子列表加载失败。'),
    });
  }
}

