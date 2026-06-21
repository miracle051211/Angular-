import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CommentReply, CommentThread } from '../../../core/models/comment.model';
import { PostDetail, PostSummary } from '../../../core/models/post.model';
import { User } from '../../../core/models/user.model';
import { API_ORIGIN } from '../../../core/services/api.config';
import { AuthService } from '../../../core/services/auth.service';
import { PostService } from '../../../core/services/post.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';

type ReportTarget =
  | { readonly kind: 'post'; readonly id: number }
  | { readonly kind: 'comment'; readonly id: number };

@Component({
  selector: 'app-post-detail-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly postService = inject(PostService);
  private readonly toastService = inject(ToastService);
  private readonly userService = inject(UserService);
  private readonly apiOrigin = API_ORIGIN;
  protected readonly postIdNumber = Number(this.route.snapshot.paramMap.get('id') ?? 1);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly post = signal<PostDetail | null>(null);
  protected readonly comments = signal<readonly CommentThread[]>([]);
  protected readonly relatedPosts = signal<readonly PostSummary[]>([]);
  protected readonly liked = signal(false);
  protected readonly likeCount = signal(0);
  protected readonly isLikePopping = signal(false);
  protected readonly reported = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSendingComment = signal(false);
  protected readonly activeReplyId = signal<number | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly commentDraft = signal('');
  protected readonly isCommentEmojiPanelOpen = signal(false);
  protected readonly isCommentMentionPanelOpen = signal(false);
  protected readonly followingUsers = signal<readonly User[]>([]);
  protected readonly selectedCommentImages = signal<readonly File[]>([]);
  protected readonly emojis = ['😀', '😄', '🥰', '👍', '👏', '🎉', '💡', '🔥', '🌱', '✨'];
  protected readonly replyDrafts = signal<Record<number, string>>({});
  protected readonly reportTarget = signal<ReportTarget | null>(null);
  protected readonly pendingCommentLikes = signal<Record<number, boolean>>({});
  protected readonly reportCategory = signal('垃圾广告');
  protected readonly reportReason = signal('');
  protected readonly reportCategories = ['垃圾广告', '恶意攻击', '违规内容', '泄露隐私', '其他'];

  protected readonly canDeletePost = computed(() => {
    const post = this.post();
    const user = this.currentUser();
    return Boolean(post && user && post.author.id === user.id);
  });

  protected readonly contentLength = computed(() => this.post()?.content.length ?? 0);
  protected readonly readingMinutes = computed(() => Math.max(1, Math.ceil(this.contentLength() / 450)));

  constructor() {
    this.authService.loadCurrentUser();
    this.loadPost();
  }

  protected loadPost(): void {
    this.isLoading.set(true);
    this.postService.getPost(this.postIdNumber).subscribe({
      next: (response) => {
        this.post.set(response.data);
        this.comments.set(response.data.comments ?? []);
        this.liked.set(Boolean(response.data.isLiked));
        this.likeCount.set(response.data.likeCount ?? 0);
        this.isLoading.set(false);
        this.loadRelatedPosts(response.data);
      },
      error: (error) => {
        this.notice.set(error?.error?.message ?? '帖子加载失败');
        this.isLoading.set(false);
      },
    });
  }

  protected updateCommentDraft(value: string): void {
    this.commentDraft.set(value);
  }

  protected toggleCommentEmojiPanel(): void {
    this.isCommentEmojiPanelOpen.update((value) => !value);
    this.isCommentMentionPanelOpen.set(false);
  }

  protected toggleCommentMentionPanel(): void {
    this.isCommentMentionPanelOpen.update((value) => !value);
    this.isCommentEmojiPanelOpen.set(false);
    this.loadFollowingUsers();
  }

  protected insertCommentEmoji(emoji: string): void {
    this.commentDraft.update((value) => `${value}${emoji}`);
  }

  protected mentionCommentUser(user: User): void {
    this.commentDraft.update((value) => `${value}@${user.username} `);
    this.isCommentMentionPanelOpen.set(false);
  }

  protected handleCommentImages(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      return;
    }

    this.selectedCommentImages.update((items) => [...items, ...files].slice(0, 6));
    input.value = '';
  }

  protected removeCommentImage(index: number): void {
    this.selectedCommentImages.update((images) => images.filter((_, imageIndex) => imageIndex !== index));
  }

  protected updateReplyDraft(commentId: number, value: string): void {
    this.replyDrafts.update((drafts) => ({ ...drafts, [commentId]: value }));
  }

  protected updateReportCategory(value: string): void {
    this.reportCategory.set(value);
  }

  protected updateReportReason(value: string): void {
    this.reportReason.set(value);
  }

  protected toggleLike(): void {
    this.postService.togglePostLike(this.postIdNumber).subscribe({
      next: (response) => {
        this.liked.set(response.data.liked);
        this.likeCount.set(response.data.count);
        this.playLikePop();
      },
      error: (error) => {
        const message = error?.error?.message ?? '请先登录后再点赞';
        this.notice.set(message);
        this.toastService.warning(message);
      },
    });
  }

  protected openPostReport(): void {
    this.openReport({ kind: 'post', id: this.postIdNumber });
  }

  protected openCommentReport(commentId: number): void {
    this.openReport({ kind: 'comment', id: commentId });
  }

  protected closeReport(): void {
    this.reportTarget.set(null);
    this.reportReason.set('');
    this.reportCategory.set('垃圾广告');
  }

  protected submitReport(): void {
    const target = this.reportTarget();
    if (!target) {
      return;
    }

    const reasonText = this.reportReason().trim();
    const reason = `[${this.reportCategory()}] ${reasonText || '用户未填写补充说明'}`;
    const request =
      target.kind === 'post'
        ? this.postService.reportPost(target.id, reason)
        : this.postService.reportComment(this.postIdNumber, target.id, reason);

    request.subscribe({
      next: () => {
        if (target.kind === 'post') {
          this.reported.set(true);
        }
        this.notice.set('举报已提交，值日生会去看一眼。');
        this.toastService.success('举报已提交。');
        this.closeReport();
      },
      error: (error) => {
        const message = error?.error?.message ?? '请先登录后再举报';
        this.notice.set(message);
        this.toastService.warning(message);
      },
    });
  }

  protected deletePost(): void {
    if (!this.canDeletePost()) {
      return;
    }

    this.postService.deletePost(this.postIdNumber).subscribe({
      next: () => {
        this.toastService.success('帖子已删除。');
        void this.router.navigate(['/posts']);
      },
      error: (error) => {
        const message = error?.error?.message ?? '删除失败，可能没有权限。';
        this.notice.set(message);
        this.toastService.error(message);
      },
    });
  }

  protected submitComment(): void {
    const imageText = this.selectedCommentImages()
      .map((image) => `[图片：${image.name}]`)
      .join('\n');
    const content = [this.commentDraft().trim(), imageText].filter(Boolean).join('\n');
    if (!content || this.isSendingComment()) {
      return;
    }

    this.isSendingComment.set(true);
    this.postService.createComment(this.postIdNumber, content).subscribe({
      next: (response) => {
        this.comments.update((comments) => [response.data, ...comments]);
        this.commentDraft.set('');
        this.selectedCommentImages.set([]);
        this.isCommentEmojiPanelOpen.set(false);
        this.isCommentMentionPanelOpen.set(false);
        this.isSendingComment.set(false);
        this.toastService.success('评论已发送。');
      },
      error: (error) => {
        const message = error?.error?.message ?? '评论发送失败';
        this.notice.set(message);
        this.toastService.error(message);
        this.isSendingComment.set(false);
      },
    });
  }

  protected toggleReply(commentId: number): void {
    this.activeReplyId.update((activeId) => (activeId === commentId ? null : commentId));
  }

  protected submitReply(comment: CommentThread): void {
    const content = (this.replyDrafts()[comment.id] ?? '').trim();
    if (!content) {
      return;
    }

    this.postService.createComment(this.postIdNumber, content, comment.id).subscribe({
      next: (response) => {
        const reply = response.data as unknown as CommentReply;
        this.comments.update((comments) =>
          comments.map((item) =>
            item.id === comment.id ? { ...item, replies: [reply, ...item.replies] } : item,
          ),
        );
        this.replyDrafts.update((drafts) => ({ ...drafts, [comment.id]: '' }));
        this.activeReplyId.set(null);
        this.toastService.success('回复已发送。');
      },
      error: (error) => {
        const message = error?.error?.message ?? '回复发送失败';
        this.notice.set(message);
        this.toastService.error(message);
      },
    });
  }

  protected toggleCommentLike(commentId: number): void {
    if (this.pendingCommentLikes()[commentId]) {
      return;
    }

    const current = this.findCommentLikeState(commentId);
    if (!current) {
      return;
    }

    const nextLiked = !current.liked;
    const nextCount = Math.max(0, current.count + (nextLiked ? 1 : -1));

    this.pendingCommentLikes.update((likes) => ({ ...likes, [commentId]: true }));
    this.patchCommentLike(commentId, nextLiked, nextCount);

    this.postService.toggleCommentLike(this.postIdNumber, commentId).subscribe({
      next: (response) => {
        this.patchCommentLike(commentId, response.data.liked, response.data.count);
        this.clearPendingCommentLike(commentId);
      },
      error: (error) => {
        this.patchCommentLike(commentId, current.liked, current.count);
        this.clearPendingCommentLike(commentId);
        const message = error?.error?.message ?? '请先登录后再点赞';
        this.notice.set(message);
        this.toastService.warning(message);
      },
    });
  }

  protected formatTime(value: string): string {
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

  protected mediaSrc(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    return `${this.apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
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

  protected avatarSrc(avatar: string | null | undefined, username: string): string {
    if (avatar) {
      return this.mediaSrc(avatar);
    }

    return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(username || 'dongtian')}`;
  }

  private loadRelatedPosts(post: PostDetail): void {
    this.postService.listPosts({ boardId: post.board.id, perPage: 5 }).subscribe({
      next: (response) =>
        this.relatedPosts.set(response.data.items.filter((item) => item.id !== post.id).slice(0, 4)),
      error: () => this.relatedPosts.set([]),
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

  private openReport(target: ReportTarget): void {
    this.reportTarget.set(target);
    this.reportReason.set('');
    this.reportCategory.set('垃圾广告');
  }

  private playLikePop(): void {
    this.isLikePopping.set(false);
    window.setTimeout(() => this.isLikePopping.set(true));
    window.setTimeout(() => this.isLikePopping.set(false), 520);
  }

  private patchCommentLike(commentId: number, liked: boolean, count: number): void {
    this.comments.update((comments) =>
      comments.map((comment) => {
        if (comment.id === commentId) {
          return { ...comment, isLiked: liked, likeCount: count };
        }

        return {
          ...comment,
          replies: comment.replies.map((reply) =>
            reply.id === commentId ? { ...reply, isLiked: liked, likeCount: count } : reply,
          ),
        };
      }),
    );
  }

  private findCommentLikeState(commentId: number): { readonly liked: boolean; readonly count: number } | null {
    for (const comment of this.comments()) {
      if (comment.id === commentId) {
        return { liked: Boolean(comment.isLiked), count: comment.likeCount || 0 };
      }

      const reply = comment.replies.find((item) => item.id === commentId);
      if (reply) {
        return { liked: Boolean(reply.isLiked), count: reply.likeCount || 0 };
      }
    }

    return null;
  }

  private clearPendingCommentLike(commentId: number): void {
    this.pendingCommentLikes.update((likes) => {
      const next = { ...likes };
      delete next[commentId];
      return next;
    });
  }
}
