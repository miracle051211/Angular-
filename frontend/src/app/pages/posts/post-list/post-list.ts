import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Board } from '../../../core/models/board.model';
import { PostSummary } from '../../../core/models/post.model';
import { API_ORIGIN } from '../../../core/services/api.config';
import { PaginatedPosts, PostService } from '../../../core/services/post.service';

@Component({
  selector: 'app-post-list-page',
  imports: [RouterLink],
  templateUrl: './post-list.html',
  styleUrl: './post-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostListPage {
  private readonly apiOrigin = API_ORIGIN;
  private readonly postService = inject(PostService);
  private readonly route = inject(ActivatedRoute);
  private readonly perPage = 18;
  private readonly boards = signal<readonly Board[]>([]);
  private readonly posts = signal<readonly PostSummary[]>([]);
  private readonly pagination = signal<Omit<PaginatedPosts, 'items'>>({
    page: 1,
    perPage: this.perPage,
    total: 0,
    pages: 1,
  });

  protected readonly isLoading = signal(true);
  protected readonly notice = signal<string | null>(null);
  protected readonly boardOptions = computed(() => this.boards());
  protected readonly selectedBoardId = signal<number | null>(null);
  protected readonly sortMode = signal<'latest' | 'hot'>('latest');
  protected readonly searchQuery = signal('');
  protected readonly page = computed(() => this.pagination().page);
  protected readonly total = computed(() => this.pagination().total);
  protected readonly pages = computed(() => Math.max(1, this.pagination().pages));
  protected readonly displayPosts = computed(() => this.sortedPosts());
  protected readonly latestStamp = computed(() => {
    const [latest] = this.posts();
    return latest ? this.toListDate(latest.createdAt) : '等待帖子抵达';
  });
  protected readonly activeBoardName = computed(() => {
    const boardId = this.selectedBoardId();
    return boardId ? (this.boards().find((board) => board.id === boardId)?.name ?? '当前板块') : '全部板块';
  });
  protected readonly hasPagination = computed(() => this.pages() > 1);
  protected readonly pageNumbers = computed(() => {
    const current = this.page();
    const totalPages = this.pages();
    const start = Math.max(1, Math.min(current - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  constructor() {
    this.loadBoards();
    this.route.queryParamMap.subscribe((params) => {
      const keyword = (params.get('search') ?? '').trim();
      const boardId = Number(params.get('boardId'));

      this.searchQuery.set(keyword);
      this.selectedBoardId.set(Number.isFinite(boardId) && boardId > 0 ? boardId : null);
      this.loadPosts(1);
    });
  }

  protected selectBoard(boardId: number | null): void {
    if (this.selectedBoardId() === boardId) {
      return;
    }
    this.selectedBoardId.set(boardId);
    this.loadPosts(1);
  }

  protected setSortMode(mode: 'latest' | 'hot'): void {
    if (this.sortMode() === mode) {
      return;
    }
    this.sortMode.set(mode);
    this.loadPosts(1);
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

  protected avatarSrc(avatar: string | null | undefined, username: string): string {
    if (avatar) {
      if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return avatar;
      }
      return `${this.apiOrigin}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
    }
    return this.fallbackAvatar(username);
  }

  protected userLevel(user: PostSummary['author']): string {
    return user.title ? `${user.title.name} Lv.${user.title.level}` : '山水之间 Lv.1';
  }

  protected userTitleProgress(user: PostSummary['author']): number {
    return Math.round((user.title?.progress ?? 0) * 100);
  }

  protected userTitleNeedText(user: PostSummary['author']): string {
    const title = user.title;
    if (!title) {
      return '当前 0，距离 Lv.2 还需 20 经验';
    }
    if (title.isMaxLevel) {
      return `当前 ${title.experience}，已经抵达满级`;
    }
    const need = Math.max(0, title.nextLevelExperience - title.currentLevelExperience);
    return `当前 ${title.experience}，距离 Lv.${title.level + 1} 还需 ${need} 经验`;
  }

  protected formatPostDate(value: string): string {
    return this.toListDate(value);
  }

  private loadPosts(page: number): void {
    this.isLoading.set(true);
    this.notice.set(null);

    this.postService
      .listPosts({
        page,
        perPage: this.perPage,
        boardId: this.selectedBoardId() ?? undefined,
        search: this.searchQuery() || undefined,
        hot: this.sortMode() === 'hot',
      })
      .subscribe({
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
          this.notice.set(error?.error?.message ?? '帖子列表加载失败。');
          this.isLoading.set(false);
        },
      });
  }

  private loadBoards(): void {
    this.postService.listBoards().subscribe({
      next: (response) => this.boards.set(response.data),
    });
  }

  private sortedPosts(): readonly PostSummary[] {
    const posts = [...this.posts()];
    if (this.sortMode() === 'hot') {
      return posts.sort((left, right) => right.readCount - left.readCount);
    }
    return posts.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }

  private toListDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    if (now.getFullYear() !== date.getFullYear()) {
      options.year = 'numeric';
    }
    return new Intl.DateTimeFormat('zh-CN', options).format(date);
  }

  private fallbackAvatar(username: string): string {
    const name = (username || '洞天').trim().slice(0, 2) || '洞天';
    const hue = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <rect width="120" height="120" rx="60" fill="hsl(${hue} 68% 82%)"/>
        <text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle"
              fill="#231815" font-family="system-ui, sans-serif" font-size="40" font-weight="700">
          ${this.escapeSvg(name)}
        </text>
      </svg>
    `.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  private escapeSvg(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }
}
