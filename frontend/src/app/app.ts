import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  NgZone,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { Board } from './core/models/board.model';
import { NotificationSummary } from './core/models/notification.model';
import { PostSummary } from './core/models/post.model';
import { User } from './core/models/user.model';
import { AuthService } from './core/services/auth.service';
import { MessageService } from './core/services/message.service';
import { NotificationService } from './core/services/notification.service';
import { PostAiAssistMode, PostService } from './core/services/post.service';
import { ToastService } from './core/services/toast.service';
import { UserService } from './core/services/user.service';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly exact: boolean;
}

interface HeaderLink {
  readonly label: string;
  readonly path: string;
}

interface HotSearch {
  readonly id: number;
  readonly title: string;
  readonly meta: string;
  readonly tag?: string;
}

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly apiOrigin = 'http://localhost:5000';
  private readonly maxPostImageBytes = 5 * 1024 * 1024;
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly notificationService = inject(NotificationService);
  private readonly postService = inject(PostService);
  protected readonly toastService = inject(ToastService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly ropeFrames = new WeakMap<SVGPathElement, number>();
  private smoothScrollFrame = 0;
  private smoothScrollTarget = 0;
  private footerLogoFrame = 0;
  private messageSummaryTimer = 0;
  private lastSummaryUserId: string | number | null = null;
  private readonly currentUrl = signal(this.router.url);
  private readonly isNavSolid = signal(false);
  private readonly isNavHidden = signal(false);
  private readonly homeFooterVisible = signal(false);
  private readonly footerRevealVisible = signal(false);
  protected readonly isMobileMenuOpen = signal(false);
  protected readonly activeInfoPanel = signal<'rules' | 'stack' | 'contact' | null>(null);
  protected readonly footerBoxRotation = signal(0);

  protected readonly navItems = signal<readonly NavItem[]>([
    { label: '首页', path: '/home', exact: true },
    { label: '帖子', path: '/posts', exact: true },
  ]);
  protected readonly utilityLinks = signal<readonly HeaderLink[]>([
    { label: '学生', path: '/posts' },
    { label: '教职工', path: '/posts' },
    { label: '校友', path: '/profile/1' },
    { label: '设置', path: '/settings' },
  ]);
  protected readonly currentUser = this.authService.currentUser;
  protected readonly isLoggedIn = this.authService.isLoggedIn;
  protected readonly notificationSummary = signal<NotificationSummary>({
    mentions: 0,
    likes: 0,
    system: 0,
    messages: 0,
    total: 0,
  });
  protected readonly headerSearchDraft = signal('');
  protected readonly searchHistory = signal<readonly string[]>([]);
  protected readonly hotSearches = signal<readonly HotSearch[]>([]);
  protected readonly boards = signal<readonly Board[]>([]);
  protected readonly isComposerOpen = signal(false);
  protected readonly isPostSubmitting = signal(false);
  protected readonly composerNotice = signal<string | null>(null);
  protected readonly isEmojiPanelOpen = signal(false);
  protected readonly isMentionPanelOpen = signal(false);
  protected readonly activeAiMode = signal<PostAiAssistMode | null>(null);
  protected readonly followingUsers = signal<readonly User[]>([]);
  protected readonly selectedImages = signal<readonly File[]>([]);
  protected readonly emojis = ['😀', '😄', '🥰', '👍', '👏', '🎉', '💡', '🔥', '🌱', '✨'];
  protected readonly minimumPostContentLength = 10;
  private readonly searchablePosts = signal<readonly PostSummary[]>([]);
  private readonly searchableUsers = signal<readonly User[]>([]);
  protected readonly isSearchingUsers = signal(false);
  private searchRequestId = 0;
  protected readonly postComposerForm = new FormGroup({
    boardId: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    }),
    content: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(this.minimumPostContentLength)],
    }),
  });
  protected composerContentLength(): number {
    return this.postComposerForm.controls.content.value.trim().length;
  }

  protected composerContentRemaining(): number {
    return Math.max(this.minimumPostContentLength - this.composerContentLength(), 0);
  }
  protected readonly searchSuggestions = computed(() => {
    const keyword = this.headerSearchDraft().trim();

    if (!keyword) {
      return [];
    }

    const normalizedKeyword = keyword.toLowerCase();

    return this.searchablePosts()
      .filter((post) =>
        [post.title, post.excerpt, post.board.name, post.author.username]
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword),
      )
      .slice(0, 8);
  });
  protected readonly userSearchSuggestions = computed(() => {
    const keyword = this.headerSearchDraft().trim().toLowerCase();

    if (!keyword) {
      return [];
    }

    return this.searchableUsers()
      .filter((user) =>
        [user.username, user.signature ?? '', user.email ?? '', user.roleName ?? '']
          .join(' ')
          .toLowerCase()
          .includes(keyword),
      )
      .slice(0, 6);
  });
  protected readonly canEnterAdmin = computed(() => Boolean(this.currentUser()?.isStaff));
  protected readonly totalUnread = computed(
    () => {
      const summary = this.notificationSummary();
      return summary.mentions + summary.likes + summary.system + summary.messages;
    },
  );

  protected readonly isAuthPage = computed(() =>
    ['/login', '/register'].some((path) => this.currentUrl().startsWith(path)),
  );
  protected readonly isHomePage = computed(() => this.currentUrl().startsWith('/home'));
  protected readonly isAdminPage = computed(() => this.currentUrl().startsWith('/admin'));
  protected readonly hasScrolled = computed(() => this.isNavSolid());
  protected readonly shouldHideNav = computed(() => this.isNavHidden());
  protected readonly isHomeFooterVisible = computed(
    () => !this.isHomePage() || this.homeFooterVisible(),
  );
  protected readonly isFooterRevealVisible = computed(() => this.footerRevealVisible());

  protected submitHeaderSearch(event: Event, value: string): void {
    event.preventDefault();

    const keyword = value.trim();

    this.headerSearchDraft.set(keyword);
    this.rememberSearch(keyword);

    void this.router.navigate(
      ['/posts'],
      keyword ? { queryParams: { search: keyword } } : { queryParams: {} },
    );
  }

  protected updateHeaderSearch(event: Event): void {
    this.setHeaderSearchDraft((event.target as HTMLInputElement).value);
  }

  protected clearHeaderSearch(): void {
    this.setHeaderSearchDraft('');
  }

  protected clearSearchHistory(): void {
    this.searchHistory.set([]);
    window.localStorage.removeItem('miracle-header-search-history');
  }

  protected removeSearchHistoryItem(event: Event, value: string): void {
    event.stopPropagation();

    const history = this.searchHistory().filter((item) => item !== value);
    this.searchHistory.set(history);

    if (history.length > 0) {
      window.localStorage.setItem('miracle-header-search-history', JSON.stringify(history));
      return;
    }

    window.localStorage.removeItem('miracle-header-search-history');
  }

  protected useHeaderSearch(value: string): void {
    const keyword = value.trim();

    if (!keyword) {
      return;
    }

    this.headerSearchDraft.set(keyword);
    this.rememberSearch(keyword);
    void this.router.navigate(['/posts'], { queryParams: { search: keyword } });
  }

  protected openHotSearch(item: HotSearch): void {
    this.rememberSearch(item.title);
    this.headerSearchDraft.set(item.title);
    void this.router.navigate(['/posts', item.id]);
  }

  protected openSuggestedPost(post: PostSummary): void {
    this.rememberSearch(post.title);
    this.headerSearchDraft.set(post.title);
    void this.router.navigate(['/posts', post.id]);
  }

  protected openSuggestedUser(user: User): void {
    this.rememberSearch(user.username);
    this.headerSearchDraft.set(user.username);
    void this.router.navigate(['/profile', user.id]);
  }

  protected openPostComposer(): void {
    if (!this.currentUser()) {
      this.toastService.warning('请先登录，再发布帖子。');
      void this.router.navigate(['/login']);
      return;
    }

    this.composerNotice.set(null);
    this.closeMobileMenu();
    this.isComposerOpen.set(true);
    this.loadFollowingUsers();
  }

  protected toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((value) => !value);
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  protected refreshMessageSummary(): void {
    this.loadMessageSummary();
  }

  protected closePostComposer(): void {
    if (this.isPostSubmitting()) {
      return;
    }

    this.isComposerOpen.set(false);
    this.composerNotice.set(null);
    this.isEmojiPanelOpen.set(false);
    this.isMentionPanelOpen.set(false);
    this.activeAiMode.set(null);
  }

  protected toggleEmojiPanel(): void {
    this.isEmojiPanelOpen.update((value) => !value);
    this.isMentionPanelOpen.set(false);
  }

  protected toggleMentionPanel(): void {
    this.isMentionPanelOpen.update((value) => !value);
    this.isEmojiPanelOpen.set(false);
    this.loadFollowingUsers();
  }

  protected insertEmoji(emoji: string): void {
    this.insertComposerText(emoji);
  }

  protected mentionUser(user: User): void {
    this.insertComposerText(`@${user.username} `);
    this.isMentionPanelOpen.set(false);
  }

  protected runComposerAi(mode: PostAiAssistMode): void {
    if (this.activeAiMode()) {
      return;
    }

    const title = this.postComposerForm.controls.title.value.trim();
    const content = this.postComposerForm.controls.content.value.trim();

    if (mode !== 'inspiration' && !content) {
      const message = '先写一点正文，AI 才知道该往哪儿帮你。';
      this.composerNotice.set(message);
      this.toastService.warning(message);
      return;
    }

    this.activeAiMode.set(mode);
    this.composerNotice.set(this.aiWorkingMessage(mode));
    this.postService.assistPost({ mode, title, content }).subscribe({
      next: (response) => {
        this.applyAiResult(mode, response.data.text);
        const usageText = this.aiUsageText(response.data.usage);
        const message = usageText ? `${response.message} · ${usageText}` : response.message;
        this.composerNotice.set(message);
        this.toastService.success(message);
        this.activeAiMode.set(null);
      },
      error: (error) => {
        const message = this.apiErrorMessage(error, 'AI 辅助暂时失败，请稍后再试。');
        this.composerNotice.set(message);
        this.toastService.error(message);
        this.activeAiMode.set(null);
      },
    });
  }

  private aiUsageText(usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  }): string | null {
    if (!usage) {
      return null;
    }

    const total = usage.total_tokens;
    if (typeof total === 'number') {
      return `DeepSeek token ${total}`;
    }

    const prompt = usage.prompt_tokens;
    const completion = usage.completion_tokens;
    if (typeof prompt === 'number' || typeof completion === 'number') {
      return `DeepSeek token 输入 ${prompt ?? 0} / 输出 ${completion ?? 0}`;
    }

    return null;
  }

  protected handleComposerImages(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      return;
    }

    const validFiles = files.filter((file) => file.size <= this.maxPostImageBytes);
    const oversizedFiles = files.filter((file) => file.size > this.maxPostImageBytes);

    if (oversizedFiles.length > 0) {
      const message = `单张图片不能超过 5MB：${oversizedFiles.map((file) => file.name).join('、')}`;
      this.composerNotice.set(message);
      this.toastService.warning(message);
    }

    if (validFiles.length > 0) {
      this.selectedImages.update((items) => [...items, ...validFiles].slice(0, 9));
    }
    input.value = '';
  }

  protected removeComposerImage(index: number): void {
    this.selectedImages.update((images) => images.filter((_, imageIndex) => imageIndex !== index));
  }

  protected submitPostComposer(): void {
    this.composerNotice.set(null);

    if (this.postComposerForm.invalid) {
      this.postComposerForm.markAllAsTouched();
      const message = this.postComposerValidationMessage();
      this.composerNotice.set(message);
      this.toastService.warning(message);
      return;
    }

    this.isPostSubmitting.set(true);
    const images = this.selectedImages();

    this.postService.createPost(this.postComposerForm.getRawValue()).subscribe({
      next: (response) => {
        if (images.length === 0) {
          this.finishPostComposer(response.data.id);
          return;
        }

        this.postService.uploadPostImages(response.data.id, images).subscribe({
          next: () => this.finishPostComposer(response.data.id),
          error: (error) => {
            this.isPostSubmitting.set(false);
            const message = this.apiErrorMessage(error, '帖子已发布，但图片上传失败。可以稍后编辑或重新上传。');
            this.composerNotice.set(message);
            this.toastService.warning(message);
            void this.router.navigate(['/posts', response.data.id]);
          },
        });
      },
      error: (error) => {
        this.isPostSubmitting.set(false);
        const message = this.apiErrorMessage(error, '发布失败，请先登录或稍后再试。');
        this.composerNotice.set(message);
        this.toastService.error(message);
      },
    });
  }

  protected logout(): void {
    this.closeMobileMenu();
    this.authService.logout().subscribe({
      next: () => {
        this.toastService.success('已退出登录。');
        void this.router.navigate(['/home']);
      },
      error: () => {
        this.authService.setCurrentUser(null);
        this.toastService.warning('本地登录状态已清除。');
        void this.router.navigate(['/home']);
      },
    });
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

  protected userLevel(user: User): string {
    return user.title ? `${user.title.name} Lv.${user.title.level}` : '山水之间 Lv.1';
  }

  protected userTitleProgress(user: User): number {
    return Math.round((user.title?.progress ?? 0) * 100);
  }

  protected userTitleNeedText(user: User): string {
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

  protected openInfoPanel(panel: 'rules' | 'stack' | 'contact', event?: Event): void {
    event?.preventDefault();
    this.activeInfoPanel.set(panel);
  }

  protected closeInfoPanel(): void {
    this.activeInfoPanel.set(null);
  }

  protected turnFooterBox(direction: -1 | 1, event?: Event): void {
    event?.stopPropagation();
    this.footerBoxRotation.update((rotation) => rotation + direction * 90);
  }

  protected tiltFooterBox(event: PointerEvent): void {
    const carousel = event.currentTarget as HTMLElement;
    const rect = carousel.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    carousel.style.setProperty('--footer-tilt-x', `${(-y * 8).toFixed(2)}deg`);
    carousel.style.setProperty('--footer-tilt-y', `${(x * 10).toFixed(2)}deg`);
  }

  protected resetFooterBoxTilt(event: PointerEvent): void {
    const carousel = event.currentTarget as HTMLElement;

    carousel.style.setProperty('--footer-tilt-x', '0deg');
    carousel.style.setProperty('--footer-tilt-y', '0deg');
  }

  protected suggestionTail(value: string): string {
    const keyword = this.headerSearchDraft().trim();

    if (!keyword || !value.startsWith(keyword)) {
      return value;
    }

    return value.slice(keyword.length);
  }

  protected userSuggestionMeta(user: User): string {
    const followers = user.followerCount ?? 0;
    const posts = user.postCount ?? 0;
    const signature = user.signature ? ` ${user.signature}` : '';
    return `${followers}粉丝 · ${posts}个帖子${signature}`;
  }

  constructor() {
    effect(() => {
      const user = this.currentUser();
      const userId = user?.id ?? null;

      if (!userId) {
        this.stopMessageSummaryPolling();
        this.lastSummaryUserId = null;
        this.notificationSummary.set({ mentions: 0, likes: 0, system: 0, messages: 0, total: 0 });
        return;
      }

      if (this.lastSummaryUserId !== userId) {
        this.lastSummaryUserId = userId;
        this.loadMessageSummary();
        this.startMessageSummaryPolling();
      }
    });

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.closeMobileMenu();
        this.homeFooterVisible.set(!event.urlAfterRedirects.startsWith('/home'));
        this.footerRevealVisible.set(false);
        this.resetSmoothScroll(0);
      });

    afterNextRender(() => {
      this.authService.loadCurrentUser();
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      this.loadHeaderSearchState();
      this.loadHeaderSearchPosts();
      this.loadBoards();
      this.setupSmoothScroll();
    });

    this.destroyRef.onDestroy(() => this.stopMessageSummaryPolling());
  }

  private loadMessageSummary(): void {
    if (!this.currentUser()) {
      this.notificationSummary.set({ mentions: 0, likes: 0, system: 0, messages: 0, total: 0 });
      return;
    }

    this.notificationService.getSummary().subscribe({
      next: (notificationResponse) => {
        const notificationSummary = notificationResponse.data;

        this.messageService.getSummary().subscribe({
          next: (messageResponse) => {
            const privateUnread = messageResponse.data.unread;
            this.notificationSummary.set({
              ...notificationSummary,
              messages: notificationSummary.messages + privateUnread,
              total: notificationSummary.total + privateUnread,
            });
          },
          error: () => this.notificationSummary.set(notificationSummary),
        });
      },
      error: () => this.notificationSummary.set({ mentions: 0, likes: 0, system: 0, messages: 0, total: 0 }),
    });
  }

  private startMessageSummaryPolling(): void {
    if (this.messageSummaryTimer) {
      return;
    }

    this.messageSummaryTimer = window.setInterval(() => this.loadMessageSummary(), 30000);
  }

  private stopMessageSummaryPolling(): void {
    if (!this.messageSummaryTimer) {
      return;
    }

    window.clearInterval(this.messageSummaryTimer);
    this.messageSummaryTimer = 0;
  }

  private loadBoards(): void {
    this.postService.listBoards().subscribe({
      next: (response) => {
        this.boards.set(response.data);
        const firstBoard = response.data[0];
        if (firstBoard && !this.postComposerForm.controls.boardId.value) {
          this.postComposerForm.controls.boardId.setValue(firstBoard.id);
        }
      },
      error: () => this.composerNotice.set('板块加载失败，请确认后端已启动。'),
    });
  }

  private loadFollowingUsers(): void {
    if (!this.currentUser() || this.followingUsers().length > 0) {
      return;
    }

    this.userService.listMyFollowing().subscribe({
      next: (response) => this.followingUsers.set(response.data),
      error: () => this.followingUsers.set([]),
    });
  }

  private insertComposerText(value: string): void {
    const contentControl = this.postComposerForm.controls.content;
    contentControl.setValue(`${contentControl.value}${value}`);
    contentControl.markAsDirty();
  }

  private applyAiResult(mode: PostAiAssistMode, text: string): void {
    const result = text.trim();
    const titleControl = this.postComposerForm.controls.title;
    const contentControl = this.postComposerForm.controls.content;

    if (!result) {
      return;
    }

    if (mode === 'inspiration') {
      const [firstLine, ...rest] = result.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (!titleControl.value.trim() && firstLine) {
        titleControl.setValue(firstLine.slice(0, 80));
      }
      if (!contentControl.value.trim()) {
        contentControl.setValue(rest.length ? rest.join('\n') : result);
      } else {
        contentControl.setValue(`${contentControl.value.trim()}\n\n${rest.length ? rest.join('\n') : result}`);
      }
    } else if (mode === 'continue') {
      contentControl.setValue(`${contentControl.value.trim()}\n\n${result}`.trim());
    } else {
      contentControl.setValue(result);
    }

    titleControl.markAsDirty();
    contentControl.markAsDirty();
  }

  private aiWorkingMessage(mode: PostAiAssistMode): string {
    const messages: Record<PostAiAssistMode, string> = {
      inspiration: 'AI 正在找灵感...',
      continue: 'AI 正在续写正文...',
      structure: 'AI 正在整理结构...',
      polish: 'AI 正在润色表达...',
    };

    return messages[mode];
  }

  private finishPostComposer(postId: number): void {
    this.isPostSubmitting.set(false);
    this.isComposerOpen.set(false);
    this.postComposerForm.reset({
      boardId: this.boards()[0]?.id ?? 1,
      title: '',
      content: '',
    });
    this.selectedImages.set([]);
    this.isEmojiPanelOpen.set(false);
    this.isMentionPanelOpen.set(false);
    this.activeAiMode.set(null);
    this.toastService.success('帖子发布成功。');
    void this.router.navigate(['/posts', postId]);
  }

  private postComposerValidationMessage(): string {
    const { boardId, title, content } = this.postComposerForm.controls;
    const contentLength = content.value.trim().length;

    if (boardId.invalid) {
      return '请选择发布板块。';
    }

    if (!title.value.trim()) {
      return '请填写帖子标题。';
    }

    if (title.hasError('minlength')) {
      return '标题至少需要 2 个字。';
    }

    if (!content.value.trim()) {
      return `正文至少需要 ${this.minimumPostContentLength} 个字。`;
    }

    if (contentLength < this.minimumPostContentLength) {
      return `正文至少需要 ${this.minimumPostContentLength} 个字，还差 ${this.minimumPostContentLength - contentLength} 个字。`;
    }

    return '标题、板块和正文都需要填写。';
  }

  private apiErrorMessage(error: unknown, fallback: string): string {
    const httpError = error as {
      readonly status?: number;
      readonly error?: { readonly message?: string } | string | ProgressEvent;
      readonly message?: string;
    };
    if (httpError.status === 0 || httpError.message?.includes('Failed to fetch')) {
      return '请求没有连到后端，请确认后端已启动，且当前前端端口已加入 CORS 白名单。';
    }

    if (typeof httpError.error === 'object' && 'message' in httpError.error && httpError.error.message) {
      return httpError.error.message;
    }

    if (typeof httpError.error === 'string') {
      return httpError.error;
    }

    return fallback;
  }

  private loadHeaderSearchState(): void {
    const rawHistory = window.localStorage.getItem('miracle-header-search-history');

    if (!rawHistory) {
      return;
    }

    try {
      const history = JSON.parse(rawHistory);

      if (Array.isArray(history)) {
        this.searchHistory.set(
          history.filter((item): item is string => typeof item === 'string').slice(0, 8),
        );
      }
    } catch {
      window.localStorage.removeItem('miracle-header-search-history');
    }
  }

  private loadHeaderSearchPosts(): void {
    this.postService.listPosts({ perPage: 30, hot: true }).subscribe({
      next: (response) => {
        const posts = response.data.items;

        this.searchablePosts.set(posts);
        this.hotSearches.set(
          posts.slice(0, 10).map((post, index) => ({
            id: post.id,
            title: post.title,
            meta: `${post.board.name} · ${post.commentCount} 条评论`,
            tag: index < 3 ? '热' : index < 5 ? '新' : undefined,
          })),
        );
      },
      error: () => {
        this.searchablePosts.set([]);
        this.hotSearches.set([]);
      },
    });
  }

  private setHeaderSearchDraft(value: string): void {
    this.headerSearchDraft.set(value);
    this.loadHeaderSearchUsers(value);
  }

  private loadHeaderSearchUsers(value: string): void {
    const keyword = value.trim();
    const requestId = ++this.searchRequestId;

    if (!keyword) {
      this.searchableUsers.set([]);
      this.isSearchingUsers.set(false);
      return;
    }

    this.isSearchingUsers.set(true);
    this.userService.searchUsers(keyword, 8).subscribe({
      next: (response) => {
        if (requestId !== this.searchRequestId) {
          return;
        }

        this.searchableUsers.set(response.data);
        this.isSearchingUsers.set(false);
      },
      error: () => {
        if (requestId !== this.searchRequestId) {
          return;
        }

        this.searchableUsers.set([]);
        this.isSearchingUsers.set(false);
      },
    });
  }

  private rememberSearch(keyword: string): void {
    if (!keyword) {
      return;
    }

    const history = [
      keyword,
      ...this.searchHistory().filter((item) => item !== keyword),
    ].slice(0, 8);

    this.searchHistory.set(history);
    window.localStorage.setItem('miracle-header-search-history', JSON.stringify(history));
  }

  private setupSmoothScroll(): void {
    this.ngZone.runOutsideAngular(() => {
      const root = document.documentElement;
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      let previousScrollY = window.scrollY || 0;
      this.smoothScrollTarget = previousScrollY;
      let lastNavSolid = previousScrollY > 16;
      let lastNavHidden = false;
      let lastHomeFooterVisible = !this.currentUrl().startsWith('/home');
      let lastFooterRevealVisible = false;
      const logoObject = document.querySelector<HTMLObjectElement>('.site-footer__logo-object');

      const handleLogoLoad = () => {
        this.prepareFooterLogoPaths();
      };

      logoObject?.addEventListener('load', handleLogoLoad);
      this.prepareFooterLogoPaths();

      const setNavState = (solid: boolean, hidden: boolean) => {
        if (solid === lastNavSolid && hidden === lastNavHidden) {
          return;
        }

        lastNavSolid = solid;
        lastNavHidden = hidden;

        this.ngZone.run(() => {
          this.isNavSolid.set(solid);
          this.isNavHidden.set(hidden);
        });
      };

      const setHomeFooterState = (visible: boolean) => {
        if (visible === lastHomeFooterVisible) {
          return;
        }

        lastHomeFooterVisible = visible;
        this.ngZone.run(() => {
          this.homeFooterVisible.set(visible);
        });
      };

      const getMaxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);

      const setFooterRevealState = (visible: boolean) => {
        if (visible === lastFooterRevealVisible) {
          return;
        }

        lastFooterRevealVisible = visible;
        if (visible) {
          this.playFooterLogoPaths();
        } else {
          this.prepareFooterLogoPaths();
        }
        this.ngZone.run(() => {
          this.footerRevealVisible.set(visible);
        });
      };

      const setScrollbarState = (scrollY: number) => {
        const maxScroll = getMaxScroll();
        const viewportRatio =
          maxScroll <= 0 ? 1 : Math.min(1, window.innerHeight / root.scrollHeight);
        const thumbHeight = Math.max(52, window.innerHeight * viewportRatio);
        const thumbTravel = Math.max(0, window.innerHeight - thumbHeight);
        const thumbTop = maxScroll <= 0 ? 0 : (scrollY / maxScroll) * thumbTravel;

        root.style.setProperty('--scrollbar-height', `${thumbHeight.toFixed(2)}px`);
        root.style.setProperty('--scrollbar-top', `${thumbTop.toFixed(2)}px`);
        root.style.setProperty('--scrollbar-opacity', maxScroll > 4 ? '1' : '0');
      };

      const updateScroll = () => {
        const nextScrollY = window.scrollY || 0;
        const delta = nextScrollY - previousScrollY;
        let nextHidden = lastNavHidden;

        if (nextScrollY < 24) {
          nextHidden = false;
        } else if (delta > 8) {
          nextHidden = true;
        } else if (delta < -8) {
          nextHidden = false;
        }

        setNavState(nextScrollY > 16, nextHidden);
        setHomeFooterState(
          !this.currentUrl().startsWith('/home') || nextScrollY > window.innerHeight * 0.72,
        );
        setFooterRevealState(getMaxScroll() <= 0 || nextScrollY + window.innerHeight > root.scrollHeight - 360);
        setScrollbarState(nextScrollY);
        previousScrollY = nextScrollY;
      };

      const clampScroll = (value: number) => {
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

        return Math.min(Math.max(value, 0), maxScroll);
      };

      const normalizeWheelDelta = (event: WheelEvent) => {
        if (event.deltaMode === 1) {
          return event.deltaY * 34;
        }

        if (event.deltaMode === 2) {
          return event.deltaY * window.innerHeight * 0.88;
        }

        return event.deltaY;
      };

      const shouldKeepNativeScroll = (event: WheelEvent, deltaY: number) => {
        const path = event.composedPath();

        for (const node of path) {
          if (!(node instanceof HTMLElement) || node === document.body) {
            continue;
          }

          if (node.matches('[contenteditable="true"], [data-native-scroll], [data-lenis-prevent]')) {
            return true;
          }

          const style = window.getComputedStyle(node);
          const canScrollY =
            /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;

          if (!canScrollY) {
            continue;
          }

          const hasRoomUp = node.scrollTop > 0;
          const hasRoomDown = node.scrollTop + node.clientHeight < node.scrollHeight - 1;

          if ((deltaY < 0 && hasRoomUp) || (deltaY > 0 && hasRoomDown)) {
            return true;
          }
        }

        return false;
      };

      const animateSmoothScroll = () => {
        const currentScrollY = window.scrollY || 0;
        const distance = this.smoothScrollTarget - currentScrollY;

        if (Math.abs(distance) < 0.28) {
          window.scrollTo(0, this.smoothScrollTarget);
          this.smoothScrollFrame = 0;
          root.classList.remove('is-wheel-smoothing');
          updateScroll();
          return;
        }

        window.scrollTo(0, currentScrollY + distance * 0.1);
        this.smoothScrollFrame = window.requestAnimationFrame(animateSmoothScroll);
      };

      const handleWheel = (event: WheelEvent) => {
        const deltaY = normalizeWheelDelta(event);

        if (
          event.ctrlKey ||
          event.metaKey ||
          reducedMotionQuery.matches ||
          shouldKeepNativeScroll(event, deltaY) ||
          getMaxScroll() <= 0
        ) {
          return;
        }

        event.preventDefault();
        root.classList.add('is-wheel-smoothing');

        if (!this.smoothScrollFrame) {
          this.smoothScrollTarget = window.scrollY || 0;
        }

        this.smoothScrollTarget = clampScroll(this.smoothScrollTarget + deltaY * 1.18);

        if (!this.smoothScrollFrame) {
          this.smoothScrollFrame = window.requestAnimationFrame(animateSmoothScroll);
        }
      };

      updateScroll();
      window.addEventListener('scroll', updateScroll, { passive: true });
      window.addEventListener('wheel', handleWheel, { passive: false });
      window.addEventListener('resize', updateScroll, { passive: true });
      window.addEventListener('miracle-notifications-read', this.handleNotificationsRead);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', updateScroll);
        window.removeEventListener('wheel', handleWheel);
        window.removeEventListener('resize', updateScroll);
        window.removeEventListener('miracle-notifications-read', this.handleNotificationsRead);
        logoObject?.removeEventListener('load', handleLogoLoad);
        window.cancelAnimationFrame(this.smoothScrollFrame);
        this.smoothScrollFrame = 0;
        window.cancelAnimationFrame(this.footerLogoFrame);
        root.classList.remove('is-wheel-smoothing');
      });
    });
  }

  private resetSmoothScroll(top = 0): void {
    window.cancelAnimationFrame(this.smoothScrollFrame);
    this.smoothScrollFrame = 0;
    this.smoothScrollTarget = top;
    document.documentElement.classList.remove('is-wheel-smoothing');
    window.scrollTo({ top, behavior: 'auto' });
  }

  private readonly handleNotificationsRead = () => this.loadMessageSummary();

  private getFooterLogoPaths(): SVGPathElement[] {
    const logoObject = document.querySelector<HTMLObjectElement>('.site-footer__logo-object');
    const logoDocument = logoObject?.contentDocument;

    if (!logoDocument) {
      return [];
    }

    return Array.from(logoDocument.querySelectorAll<SVGPathElement>('path'));
  }

  private prepareFooterLogoPaths(): boolean {
    const paths = this.getFooterLogoPaths();

    if (paths.length === 0) {
      return false;
    }

    paths.forEach((path) => {
      const length = Math.ceil(path.getTotalLength());

      path.style.fill = 'rgba(35, 24, 21, 0)';
      path.style.stroke = '#231815';
      path.style.strokeWidth = '1.2px';
      path.style.strokeOpacity = '0.72';
      path.style.strokeLinecap = 'round';
      path.style.strokeLinejoin = 'round';
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.style.transition = 'none';
      path.style.setProperty('vector-effect', 'non-scaling-stroke');
    });

    return true;
  }

  private playFooterLogoPaths(attempt = 0): void {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!this.prepareFooterLogoPaths()) {
      if (attempt < 8) {
        window.setTimeout(() => this.playFooterLogoPaths(attempt + 1), 80);
      }

      return;
    }

    const paths = this.getFooterLogoPaths();

    window.cancelAnimationFrame(this.footerLogoFrame);
    this.footerLogoFrame = window.requestAnimationFrame(() => {
      paths.forEach((path, index) => {
        if (reducedMotion) {
          path.style.strokeDashoffset = '0';
          path.style.fill = '#231815';
          path.style.strokeOpacity = '0';
          return;
        }

        const duration = 1.42 + Math.min(index, 18) * 0.018;
        const delay = 0.08 + index * 0.018;
        const fillDelay = delay + duration * 0.16;

        path.style.transition = [
          `stroke-dashoffset ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
          `fill 0.92s cubic-bezier(0.22, 1, 0.36, 1) ${fillDelay}s`,
          `stroke-opacity 0.42s ease ${fillDelay + 0.28}s`,
        ].join(', ');
        path.style.strokeDashoffset = '0';
        path.style.fill = '#231815';
        path.style.strokeOpacity = '0';
      });
    });
  }

  protected scrollToTop(): void {
    window.cancelAnimationFrame(this.smoothScrollFrame);
    this.smoothScrollFrame = 0;
    this.smoothScrollTarget = 0;
    document.documentElement.classList.remove('is-wheel-smoothing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected playNavRope(event: MouseEvent): void {
    const link = event.currentTarget as HTMLElement;
    const paths = Array.from(link.querySelectorAll<SVGPathElement>('.nav-line path'));

    paths.forEach((path, index) => this.animateRopePath(path, index));
  }

  protected popNavText(event: MouseEvent): void {
    const link = event.currentTarget as HTMLElement;
    const text = link.querySelector<HTMLElement>('.nav-text');

    if (!text) {
      return;
    }

    text.classList.remove('is-popping');
    void text.offsetWidth;
    text.classList.add('is-popping');
  }

  private animateRopePath(path: SVGPathElement, index: number): void {
    const previousFrame = this.ropeFrames.get(path);

    if (previousFrame) {
      window.cancelAnimationFrame(previousFrame);
    }

    const start = performance.now();
    const duration = 1040 + index * 80;
    const amplitude = index === 0 ? 5.75 : 4.25;
    const frequency = index === 0 ? 20.2 : 18.9;
    const damping = index === 0 ? 3.85 : 3.7;

    const draw = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const seconds = elapsed / 1000;
      const settle = 1 - progress;
      const displacement =
        -amplitude * Math.exp(-damping * seconds) * Math.sin(frequency * seconds) * settle;
      const controlY = 7 + displacement;

      path.setAttribute('d', `M 0 7 Q 5 ${controlY.toFixed(3)} 10 7`);

      if (progress < 1) {
        this.ropeFrames.set(path, window.requestAnimationFrame(draw));
        return;
      }

      path.setAttribute('d', 'M 0 7 Q 5 7 10 7');
      this.ropeFrames.delete(path);
    };

    this.ropeFrames.set(path, window.requestAnimationFrame(draw));
  }

  private fallbackAvatar(username: string): string {
    const name = (username || '娲炲ぉ').trim().slice(0, 2) || '娲炲ぉ';
    const hue = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="hsl(${hue} 68% 84%)"/>
            <stop offset="100%" stop-color="hsl(${(hue + 24) % 360} 62% 76%)"/>
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="60" fill="url(#g)"/>
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



