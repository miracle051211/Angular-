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

  protected readonly topicScents = signal<readonly TopicScent[]>([
    {
      name: '项目碎片',
      note: '截图、报错、阶段进展都可以先贴在这里。',
      path: '/posts',
      count: '26 篇',
      accent: 'var(--color-yellow)',
      tilt: '-2.4deg',
    },
    {
      name: '前端手记',
      note: 'Angular 路由、动效和页面壳的现场笔记。',
      path: '/posts',
      count: '18 篇',
      accent: 'var(--color-mint)',
      tilt: '1.6deg',
    },
    {
      name: '后端工坊',
      note: 'Flask API、权限边界和数据表的小修小补。',
      path: '/posts',
      count: '14 篇',
      accent: 'var(--color-peach)',
      tilt: '-1.2deg',
    },
    {
      name: '随便问问',
      note: '不够正式的问题，也值得被好好回答。',
      path: '/posts',
      count: '31 篇',
      accent: 'var(--color-sky)',
      tilt: '2.2deg',
    },
  ]);

  protected readonly featuredDiscussions = signal<readonly FeaturedDiscussion[]>([
    {
      title: '暂无公告',
      excerpt: '新的洞天公告会出现在这里。',
      meta: '洞天公告',
      path: '/notifications?tab=system',
      accent: 'var(--color-mint)',
    },
  ]);

  protected readonly leadNews = signal<NewsVisual>(this.emptyVisual('等待后端帖子'));
  protected readonly newsImages = signal<readonly NewsVisual[]>([
    this.emptyVisual('没有图片时，排版就是第一张图', 1),
    this.emptyVisual('真实图片会从后端帖子里来', 2),
    this.emptyVisual('留白、纸感和标题也能撑起版面', 3),
  ]);

  protected readonly hotNews = signal<readonly NewsItem[]>([
    {
      day: '16',
      month: '2026-06',
      title: '今天的首页动画终于不再僵硬',
      path: '/posts/3',
      color: 'var(--color-mint)',
    },
    {
      day: '13',
      month: '2026-06',
      title: 'Flask API 拆分思路',
      path: '/posts/2',
      color: 'var(--color-yellow)',
    },
    {
      day: '12',
      month: '2026-06',
      title: 'Angular Service 封装接口的写法',
      path: '/posts',
      color: 'var(--color-peach)',
    },
  ]);

  protected readonly forumStats = signal<readonly ForumStat[]>([
    { value: '1286', label: '洞天帖子', icon: 'posts' },
    { value: '348', label: '活跃同学', icon: 'users' },
    { value: '5240+', label: '评论互动', icon: 'comments' },
    { value: '16', label: '讨论板块', icon: 'boards' },
  ]);

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
      error: () => undefined,
    });

    this.postService.listPosts({ perPage: 7 }).subscribe({
      next: (response) => {
        this.applyPostsToNews(response.data.items);
      },
      error: () => undefined,
    });

    this.postService.listBoards().subscribe({
      next: (response) => {
        this.applyBoardsToTopicScents(response.data);
      },
      error: () => undefined,
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
      error: () => undefined,
    });
  }

  private applyBoardsToTopicScents(boards: readonly Board[]): void {
    const visibleBoards = boards.slice(0, 4);
    if (visibleBoards.length === 0) {
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
