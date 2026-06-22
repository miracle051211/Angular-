import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Board } from '../../core/models/board.model';
import { PostSummary } from '../../core/models/post.model';
import { mediaUrl } from '../../core/utils/media-url';
import { NotificationService } from '../../core/services/notification.service';
import { PostService } from '../../core/services/post.service';
import { HeroVisualComponent } from './hero-visual/hero-visual';
import { SignatureWritingComponent } from './signature-writing/signature-writing';

interface NewsVisual {
  readonly day: string;
  readonly month: string;
  readonly title: string;
  readonly excerpt: string;
  readonly boardName: string;
  readonly path: string;
  readonly image: string | null;
  readonly imageAlt: string;
  readonly accent: string;
  readonly hasImage: boolean;
}

interface NewsItem {
  readonly day: string;
  readonly month: string;
  readonly title: string;
  readonly path: string;
  readonly color: string;
}

interface ForumStat {
  readonly value: string;
  readonly label: string;
  readonly icon: 'posts' | 'users' | 'comments' | 'boards';
}

interface TopicScent {
  readonly boardId?: number;
  readonly name: string;
  readonly note: string;
  readonly path: string;
  readonly count: string;
  readonly accent: string;
  readonly tilt: string;
}

interface FeaturedDiscussion {
  readonly title: string;
  readonly excerpt: string;
  readonly meta: string;
  readonly path: string;
  readonly accent: string;
}

@Component({
  selector: 'app-home-page',
  imports: [HeroVisualComponent, RouterLink, SignatureWritingComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);
  private readonly postService = inject(PostService);
  private readonly newsAccents = [
    'var(--color-mint)',
    'var(--color-yellow)',
    'var(--color-peach)',
    'var(--color-sky)',
    'var(--color-pink)',
  ] as const;

  protected readonly isHotNewsVisible = signal(false);
  protected readonly isForumStatsVisible = signal(false);
  protected readonly isTopicScentsVisible = signal(false);
  protected readonly isDiscussionWallVisible = signal(false);

  protected readonly topicScents = signal<readonly TopicScent[]>([]);
  protected readonly featuredDiscussions = signal<readonly FeaturedDiscussion[]>([]);
  protected readonly leadNews = signal<NewsVisual | null>(null);
  protected readonly newsImages = signal<readonly NewsVisual[]>([]);
  protected readonly hotNews = signal<readonly NewsItem[]>([]);
  protected readonly forumStats = signal<readonly ForumStat[]>([]);

  constructor() {
    this.loadForumData();

    afterNextRender(() => {
      this.observeHomeSections();
    });
  }

  protected isStatIcon(item: ForumStat, icon: ForumStat['icon']): boolean {
    return item.icon === icon;
  }

  private loadForumData(): void {
    this.notificationService.listAnnouncements(3).subscribe({
      next: (response) => {
        if (response.data.length === 0) {
          this.featuredDiscussions.set([]);
          return;
        }

        this.featuredDiscussions.set(
          response.data.map((item, index) => ({
            title: item.title || '洞天公告',
            excerpt: item.body,
            meta: this.formatAnnouncementDate(item.createdAt),
            path: '/notifications?tab=system',
            accent: this.newsAccents[index % 3],
          })),
        );
      },
      error: () => this.featuredDiscussions.set([]),
    });

    this.postService.listPosts({ perPage: 7 }).subscribe({
      next: (response) => {
        this.applyPostsToNews(response.data.items);
      },
      error: () => this.applyPostsToNews([]),
    });

    this.postService.listBoards().subscribe({
      next: (response) => {
        this.applyBoardsToTopicScents(response.data);
      },
      error: () => this.topicScents.set([]),
    });

    this.postService.getStats().subscribe({
      next: (response) => {
        this.forumStats.set([
          { value: this.formatStat(response.data.posts), label: '洞天帖子', icon: 'posts' },
          { value: this.formatStat(response.data.users), label: '活跃同学', icon: 'users' },
          { value: this.formatStat(response.data.comments), label: '评论互动', icon: 'comments' },
          { value: this.formatStat(response.data.boards), label: '讨论板块', icon: 'boards' },
        ]);
      },
      error: () => this.forumStats.set([]),
    });
  }

  private applyBoardsToTopicScents(boards: readonly Board[]): void {
    const visibleBoards = boards.slice(0, 4);
    if (visibleBoards.length === 0) {
      this.topicScents.set([]);
      return;
    }

    this.topicScents.set(
      visibleBoards.map((board, index) => ({
        name: board.name,
        note: this.boardNote(board, index),
        boardId: board.id,
        path: '/posts',
        count: `${board.postCount ?? 0} 篇`,
        accent: this.newsAccents[index % this.newsAccents.length],
        tilt: ['-2.4deg', '1.6deg', '-1.2deg', '2.2deg'][index % 4],
      })),
    );
  }

  private applyPostsToNews(posts: readonly PostSummary[]): void {
    if (posts.length === 0) {
      this.leadNews.set(null);
      this.newsImages.set([]);
      this.hotNews.set([]);
      return;
    }

    const [lead, ...rest] = posts;

    this.leadNews.set(this.postToNewsVisual(lead, 0));
    this.newsImages.set(rest.slice(0, 3).map((post, index) => this.postToNewsVisual(post, index + 1)));
    this.hotNews.set(
      posts.map((post, index) => ({
        ...this.postToNewsItem(post),
        color: this.newsAccents[index % this.newsAccents.length],
      })),
    );
  }

  private postToNewsVisual(post: PostSummary, index: number): NewsVisual {
    const { day, month } = this.splitDate(post.createdAt);
    const firstImage = post.images?.[0];
    const image = firstImage ? this.mediaSrc(firstImage.url) : null;

    return {
      day,
      month,
      title: post.title,
      excerpt: post.excerpt || '这条帖子还没有摘要，留白就是它的第一张图。',
      boardName: post.board.name,
      path: `/posts/${post.id}`,
      image,
      imageAlt: firstImage?.originalName || post.title,
      accent: this.newsAccents[index % this.newsAccents.length],
      hasImage: Boolean(image),
    };
  }

  private postToNewsItem(post: PostSummary): Omit<NewsItem, 'color'> {
    const { day, month } = this.splitDate(post.createdAt);

    return {
      day,
      month,
      title: post.title,
      path: `/posts/${post.id}`,
    };
  }

  private boardNote(board: Board, index: number): string {
    const count = board.postCount ?? 0;
    if (count === 0) {
      return '这个板块还很安静，等第一条帖子落下来。';
    }

    const notes = [
      `这里已经收着 ${count} 条帖子，最近的讨论可以从这里翻起。`,
      `${count} 条记录在这里慢慢堆叠，适合继续补充线索。`,
      `已有 ${count} 篇内容，板块里的问题和答案都在生长。`,
      `${count} 个话题停在这里，随手点进去就能接上。`,
    ];
    return notes[index % notes.length];
  }

  private emptyVisual(title: string, index = 0): NewsVisual {
    return {
      day: '--',
      month: '正在读取',
      title,
      excerpt: '如果后端没有返回图片，首页会自动使用文字、日期和板块标签重新排版。',
      boardName: '洞天',
      path: '/posts',
      image: null,
      imageAlt: '',
      accent: this.newsAccents[index % this.newsAccents.length],
      hasImage: false,
    };
  }

  private mediaSrc(url: string): string {
    return mediaUrl(url) ?? '';
  }

  private splitDate(value: string): { day: string; month: string } {
    const [date = value] = value.split('T');
    const [year = '', month = '', day = ''] = date.split('-');

    return {
      day: day || '01',
      month: year && month ? `${year}-${month}` : date,
    };
  }

  private formatStat(value: number): string {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k+`;
    }

    return `${value}`;
  }

  private formatAnnouncementDate(value: string): string {
    const { day, month } = this.splitDate(value);
    return `${month}-${day}`;
  }

  private observeHomeSections(): void {
    const sectionSignals: ReadonlyArray<[string, { set(value: boolean): void }]> = [
      ['.topic-scents', this.isTopicScentsVisible],
      ['.discussion-wall', this.isDiscussionWallVisible],
      ['.hot-news', this.isHotNewsVisible],
      ['.forum-stats', this.isForumStatsVisible],
    ];

    if (!('IntersectionObserver' in window)) {
      this.isTopicScentsVisible.set(true);
      this.isDiscussionWallVisible.set(true);
      this.isHotNewsVisible.set(true);
      this.isForumStatsVisible.set(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const matched = sectionSignals.find(([selector]) => entry.target.matches(selector));

          if (matched) {
            matched[1].set(true);
            observer.unobserve(entry.target);
          }
        }
      },
      {
        rootMargin: '0px 0px 12% 0px',
        threshold: 0.01,
      },
    );

    for (const [selector, targetSignal] of sectionSignals) {
      const element = this.elementRef.nativeElement.querySelector(selector);

      if (!element) {
        targetSignal.set(true);
        continue;
      }

      observer.observe(element);
    }

    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
