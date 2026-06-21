import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PostSummary } from '../../../core/models/post.model';
import { PaginatedPosts, PostService } from '../../../core/services/post.service';

@Component({
  selector: 'app-post-management-page',
  imports: [RouterLink],
  templateUrl: './post-management.html',
  styleUrl: './post-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostManagementPage {
  private readonly postService = inject(PostService);
  private readonly perPage = 10;

  protected readonly posts = signal<readonly PostSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly notice = signal<string | null>(null);
  protected readonly pagination = signal<Omit<PaginatedPosts, 'items'>>({
    page: 1,
    perPage: this.perPage,
    total: 0,
    pages: 1,
  });

  constructor() {
    this.loadPosts(1);
  }

  protected page(): number {
    return this.pagination().page;
  }

  protected pages(): number {
    return Math.max(1, this.pagination().pages);
  }

  protected total(): number {
    return this.pagination().total;
  }

  protected hasPagination(): boolean {
    return this.pages() > 1;
  }

  protected pageNumbers(): readonly number[] {
    const current = this.page();
    const totalPages = this.pages();
    const start = Math.max(1, Math.min(current - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  protected goToPage(page: number): void {
    const target = Math.min(Math.max(1, page), this.pages());
    if (target === this.page() || this.isLoading()) {
      return;
    }

    this.loadPosts(target);
  }

  protected previousPage(): void {
    this.goToPage(this.page() - 1);
  }

  protected nextPage(): void {
    this.goToPage(this.page() + 1);
  }

  protected formatPostDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private loadPosts(page: number): void {
    this.isLoading.set(true);
    this.notice.set(null);

    this.postService.listPosts({ mine: true, page, perPage: this.perPage }).subscribe({
      next: (response) => {
        this.posts.set(response.data.items);
        this.pagination.set({
          page: response.data.page,
          perPage: response.data.perPage,
          total: response.data.total,
          pages: response.data.pages,
        });
        this.isLoading.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error) => {
        this.notice.set(error?.error?.message ?? '帖子管理列表加载失败。');
        this.isLoading.set(false);
      },
    });
  }
}
