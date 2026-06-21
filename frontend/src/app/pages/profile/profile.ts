import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PostSummary } from '../../core/models/post.model';
import { User } from '../../core/models/user.model';
import { API_ORIGIN } from '../../core/services/api.config';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UserProfileStats, UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly apiOrigin = API_ORIGIN;
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private cropImage: HTMLImageElement | null = null;
  private dragStart: { pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null =
    null;

  protected readonly user = signal<User | null>(null);
  protected readonly posts = signal<readonly PostSummary[]>([]);
  protected readonly stats = signal<readonly { label: string; value: number }[]>([
    { label: '发布帖子', value: 0 },
    { label: '粉丝', value: 0 },
    { label: '关注', value: 0 },
    { label: '收到评论', value: 0 },
  ]);
  protected readonly isLoading = signal(true);
  protected readonly isUploadingAvatar = signal(false);
  protected readonly isDraggingCrop = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly avatarMessage = signal<string | null>(null);
  protected readonly isFollowUpdating = signal(false);
  protected readonly isEditorOpen = signal(false);
  protected readonly isSavingProfile = signal(false);
  protected readonly cropImageUrl = signal<string | null>(null);
  protected readonly cropScale = signal(1);
  protected readonly cropOffsetX = signal(0);
  protected readonly cropOffsetY = signal(0);
  protected readonly currentUser = this.authService.currentUser;
  protected readonly profileForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(24)],
    }),
    gender: new FormControl<'male' | 'female' | 'secret' | ''>('', { nonNullable: true }),
    signature: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
  });

  constructor() {
    effect(() => {
      const profileUser = this.user();

      if (profileUser && !this.isEditorOpen()) {
        this.syncProfileForm(profileUser);
      }
    });

    const subscription = this.route.paramMap.subscribe((params) => {
      const userId = params.get('id');

      if (!userId) {
        this.errorMessage.set('没有找到这个用户');
        this.isLoading.set(false);
        return;
      }

      this.loadProfile(userId);
    });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
      this.revokeCropImageUrl();
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

  protected canEditProfile(profileUser: User): boolean {
    return this.currentUser()?.id === profileUser.id;
  }

  protected canFollow(profileUser: User): boolean {
    const current = this.currentUser();
    return Boolean(current && current.id !== profileUser.id);
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

  protected openProfileEditor(profileUser: User): void {
    this.syncProfileForm(profileUser);
    this.avatarMessage.set(null);
    this.isEditorOpen.set(true);
  }

  protected closeProfileEditor(): void {
    if (this.isSavingProfile() || this.isUploadingAvatar()) {
      return;
    }

    this.isEditorOpen.set(false);
    this.closeCropper();
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid || this.isSavingProfile()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const { username, gender, signature } = this.profileForm.getRawValue();
    this.isSavingProfile.set(true);
    this.userService.updateMyProfile({ username, gender, signature }).subscribe({
      next: (response) => {
        this.authService.setCurrentUser(response.data);
        this.user.set(response.data);
        this.stats.set(this.formatStatsFromUser(response.data));
        this.toastService.success('资料已更新。');
        this.isSavingProfile.set(false);
        this.isEditorOpen.set(false);
      },
      error: (error) => {
        this.toastService.error(error?.error?.message ?? '资料保存失败。');
        this.isSavingProfile.set(false);
      },
    });
  }

  protected toggleFollow(profileUser: User): void {
    if (this.isFollowUpdating()) {
      return;
    }

    this.isFollowUpdating.set(true);
    const request = profileUser.isFollowing
      ? this.userService.unfollowUser(profileUser.id)
      : this.userService.followUser(profileUser.id);

    request.subscribe({
      next: (response) => {
        if (response.data) {
          this.user.set(response.data);
          this.stats.set(this.formatStatsFromUser(response.data));
        }
        this.toastService.success(profileUser.isFollowing ? '已取消关注。' : '关注成功。');
        this.isFollowUpdating.set(false);
      },
      error: (error) => {
        const message = error?.error?.message ?? '关注操作失败';
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isFollowUpdating.set(false);
      },
    });
  }

  protected selectAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.avatarMessage.set('头像只支持 jpg、png、webp');
      this.toastService.warning('头像只支持 jpg、png、webp。');
      input.value = '';
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      this.avatarMessage.set('头像不能超过 3MB');
      this.toastService.warning('头像不能超过 3MB。');
      input.value = '';
      return;
    }

    this.openCropper(file);
    input.value = '';
  }

  protected setCropScale(event: Event): void {
    this.cropScale.set(Number((event.target as HTMLInputElement).value));
  }

  protected startCropDrag(event: PointerEvent): void {
    if (this.isUploadingAvatar()) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    this.dragStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: this.cropOffsetX(),
      offsetY: this.cropOffsetY(),
    };
    this.isDraggingCrop.set(true);
  }

  protected moveCropDrag(event: PointerEvent): void {
    if (!this.dragStart || this.dragStart.pointerId !== event.pointerId) {
      return;
    }

    this.cropOffsetX.set(this.dragStart.offsetX + event.clientX - this.dragStart.x);
    this.cropOffsetY.set(this.dragStart.offsetY + event.clientY - this.dragStart.y);
  }

  protected endCropDrag(event: PointerEvent): void {
    if (this.dragStart?.pointerId === event.pointerId) {
      this.dragStart = null;
      this.isDraggingCrop.set(false);
    }
  }

  protected closeCropper(): void {
    this.cropImage = null;
    this.dragStart = null;
    this.isDraggingCrop.set(false);
    this.cropScale.set(1);
    this.cropOffsetX.set(0);
    this.cropOffsetY.set(0);
    this.revokeCropImageUrl();
  }

  protected confirmAvatarCrop(stage: HTMLElement): void {
    if (!this.cropImage) {
      this.avatarMessage.set('图片还没有准备好');
      return;
    }

    const canvas = document.createElement('canvas');
    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d');

    if (!context) {
      this.avatarMessage.set('浏览器暂时不能裁剪图片');
      return;
    }

    const stageSize = stage.getBoundingClientRect().width || 320;
    const image = this.cropImage;
    const baseScale = Math.max(stageSize / image.width, stageSize / image.height);
    const drawScale = baseScale * this.cropScale() * (outputSize / stageSize);
    const drawWidth = image.width * drawScale;
    const drawHeight = image.height * drawScale;
    const offsetRatio = outputSize / stageSize;
    const drawX = (outputSize - drawWidth) / 2 + this.cropOffsetX() * offsetRatio;
    const drawY = (outputSize - drawHeight) / 2 + this.cropOffsetY() * offsetRatio;

    context.fillStyle = '#fff8ec';
    context.fillRect(0, 0, outputSize, outputSize);
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    canvas.toBlob((blob) => {
      if (!blob) {
        this.avatarMessage.set('头像生成失败');
        return;
      }

      this.uploadCroppedAvatar(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  }

  private openCropper(file: File): void {
    this.avatarMessage.set(null);
    this.revokeCropImageUrl();

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      this.cropImage = image;
      this.cropImageUrl.set(url);
      this.cropScale.set(1);
      this.cropOffsetX.set(0);
      this.cropOffsetY.set(0);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      this.avatarMessage.set('图片读取失败');
    };
    image.src = url;
  }

  private uploadCroppedAvatar(file: File): void {
    this.isUploadingAvatar.set(true);
    this.avatarMessage.set(null);

    this.userService.uploadAvatar(file).subscribe({
      next: (response) => {
        this.authService.setCurrentUser(response.data);
        this.user.set(response.data);
        this.syncProfileForm(response.data);
        this.avatarMessage.set('头像已换好');
        this.toastService.success('头像已更新。');
        this.isUploadingAvatar.set(false);
        this.closeCropper();
      },
      error: (error) => {
        const message = error?.error?.message ?? '头像上传失败';
        this.avatarMessage.set(message);
        this.toastService.error(message);
        this.isUploadingAvatar.set(false);
      },
    });
  }

  private loadProfile(userId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.userService.getProfile(userId).subscribe({
      next: (response) => {
        this.user.set(response.data.user);
        this.posts.set(response.data.posts);
        this.stats.set(this.formatStats(response.data.stats, response.data.user));
        this.isLoading.set(false);
      },
      error: (error) => {
        this.user.set(null);
        this.posts.set([]);
        this.errorMessage.set(error?.error?.message ?? '资料加载失败');
        this.isLoading.set(false);
      },
    });
  }

  private formatStats(stats: UserProfileStats, user: User): readonly { label: string; value: number }[] {
    return [
      { label: '发布帖子', value: stats.posts },
      { label: '粉丝', value: user.followerCount ?? 0 },
      { label: '关注', value: user.followingCount ?? 0 },
      { label: '收到评论', value: stats.comments },
    ];
  }

  private formatStatsFromUser(user: User): readonly { label: string; value: number }[] {
    const currentStats = this.stats();
    return [
      currentStats[0] ?? { label: '发布帖子', value: 0 },
      { label: '粉丝', value: user.followerCount ?? 0 },
      { label: '关注', value: user.followingCount ?? 0 },
      currentStats[3] ?? { label: '收到评论', value: 0 },
    ];
  }

  private syncProfileForm(profileUser: User): void {
    this.profileForm.patchValue(
      {
        username: profileUser.username,
        gender: profileUser.gender ?? '',
        signature: profileUser.signature ?? '',
      },
      { emitEvent: false },
    );
  }

  private revokeCropImageUrl(): void {
    const url = this.cropImageUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.cropImageUrl.set(null);
    }
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
