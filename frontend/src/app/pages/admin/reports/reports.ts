import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { AdminPage, AdminReport, AdminReportStatus, AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-reports-page',
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReportsPage {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  protected readonly reports = signal<readonly AdminReport[]>([]);
  protected readonly page = signal<AdminPage<AdminReport> | null>(null);
  protected readonly resolvingReportId = signal<number | null>(null);
  protected readonly processingReportId = signal<number | null>(null);

  constructor() {
    this.loadReports();
  }

  protected setStatus(reportId: number, status: AdminReportStatus): void {
    this.adminService.setReportStatus(reportId, status).subscribe({
      next: (response) => {
        this.reports.update((reports) =>
          reports.map((report) => (report.id === reportId ? response.data : report)),
        );
        this.toastService.success(status === 'resolved' ? '举报已处理。' : '举报已驳回。');
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '举报状态更新失败，可能权限不足。'),
    });
  }

  protected openResolveOptions(reportId: number): void {
    this.resolvingReportId.update((current) => (current === reportId ? null : reportId));
  }

  protected approveReport(report: AdminReport, action: 'hide' | 'delete'): void {
    if (this.processingReportId()) {
      return;
    }

    this.processingReportId.set(report.id);
    if (action === 'delete') {
      this.deleteReportedTarget(report);
      return;
    }

    this.hideReportedTarget(report);
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
    this.loadReports(page);
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

  private hideReportedTarget(report: AdminReport): void {
    const request: Observable<unknown> =
      report.targetType === 'post'
        ? this.adminService.setPostActive(report.targetId, false)
        : this.adminService.setCommentActive(report.targetId, false);

    request.subscribe({
      next: () => this.resolveReport(report.id, '内容已隐藏，举报已通过。'),
      error: (error: { readonly error?: { readonly message?: string } }) => {
        this.clearResolveState();
        this.toastService.error(error?.error?.message ?? '隐藏内容失败，可能目标已经不存在。');
      },
    });
  }

  private deleteReportedTarget(report: AdminReport): void {
    const request: Observable<unknown> =
      report.targetType === 'post'
        ? this.adminService.deletePost(report.targetId)
        : this.adminService.deleteComment(report.targetId);

    request.subscribe({
      next: () => {
        this.reports.update((reports) =>
          reports.filter((item) => item.targetType !== report.targetType || item.targetId !== report.targetId),
        );
        this.clearResolveState();
        this.toastService.success('内容已从数据库删除。');
      },
      error: (error: { readonly error?: { readonly message?: string } }) => {
        this.clearResolveState();
        this.toastService.error(error?.error?.message ?? '删除内容失败，可能目标已经不存在。');
      },
    });
  }

  private resolveReport(reportId: number, message: string): void {
    this.adminService.setReportStatus(reportId, 'resolved').subscribe({
      next: (response) => {
        this.reports.update((reports) =>
          reports.map((report) => (report.id === reportId ? response.data : report)),
        );
        this.clearResolveState();
        this.toastService.success(message);
      },
      error: (error) => {
        this.clearResolveState();
        this.toastService.error(error?.error?.message ?? '举报状态更新失败，内容已处理但举报未标记。');
      },
    });
  }

  private clearResolveState(): void {
    this.processingReportId.set(null);
    this.resolvingReportId.set(null);
  }

  private loadReports(page = 1): void {
    this.adminService.listReports(page).subscribe({
      next: (response) => {
        this.page.set(response.data);
        this.reports.set(response.data.items);
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '举报列表加载失败。'),
    });
  }
}

