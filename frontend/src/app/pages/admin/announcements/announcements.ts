import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AdminAnnouncement, AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-announcements-page',
  imports: [ReactiveFormsModule],
  templateUrl: './announcements.html',
  styleUrl: './announcements.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAnnouncementsPage {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  protected readonly announcements = signal<readonly AdminAnnouncement[]>([]);
  protected readonly isPublishing = signal(false);
  protected readonly deletingId = signal<number | null>(null);
  protected readonly form = new FormGroup({
    content: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
  });

  constructor() {
    this.loadAnnouncements();
  }

  protected publishAnnouncement(): void {
    const content = this.form.controls.content.value.trim();

    if (!content) {
      this.toastService.warning('请填写公告内容。');
      return;
    }

    this.isPublishing.set(true);
    this.adminService.createAnnouncement(content).subscribe({
      next: (response) => {
        this.announcements.update((items) => [response.data, ...items]);
        this.form.reset();
        this.isPublishing.set(false);
        this.toastService.success('公告已发布。');
      },
      error: (error) => {
        this.isPublishing.set(false);
        this.toastService.error(error?.error?.message ?? '公告发布失败。');
      },
    });
  }

  protected deleteAnnouncement(item: AdminAnnouncement): void {
    if (this.deletingId()) {
      return;
    }

    const confirmed = window.confirm(`确定删除公告“${item.content.slice(0, 24)}”吗？`);
    if (!confirmed) {
      return;
    }

    this.deletingId.set(item.id);
    this.adminService.deleteAnnouncement(item.id).subscribe({
      next: () => {
        this.announcements.update((items) => items.filter((candidate) => candidate.id !== item.id));
        this.deletingId.set(null);
        this.toastService.success('公告已删除。');
      },
      error: (error) => {
        this.deletingId.set(null);
        this.toastService.error(error?.error?.message ?? '公告删除失败。');
      },
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

  protected audienceText(item: AdminAnnouncement): string {
    return `全体成员（${item.receiverCount}人）`;
  }

  private loadAnnouncements(): void {
    this.adminService.listAnnouncements().subscribe({
      next: (response) => this.announcements.set(response.data),
      error: (error) => this.toastService.error(error?.error?.message ?? '公告列表加载失败。'),
    });
  }
}
