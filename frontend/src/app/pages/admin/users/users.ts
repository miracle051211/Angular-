import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { User } from '../../../core/models/user.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-users-page',
  imports: [RouterLink],
  templateUrl: './users.html',
  styleUrl: './users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPage {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  protected readonly users = signal<readonly (User & { active: boolean; postCount: number })[]>([]);

  constructor() {
    this.loadUsers();
  }

  protected toggleUser(userId: string): void {
    const user = this.users().find((item) => item.id === userId);

    if (!user) {
      return;
    }

    this.adminService.setUserActive(userId, !user.active).subscribe({
      next: (response) => {
        this.users.update((users) =>
          users.map((item) =>
            item.id === userId
              ? {
                  ...item,
                  ...response.data,
                  active: Boolean(response.data.isActive),
                  postCount: response.data.postCount ?? item.postCount,
                }
              : item,
          ),
        );
        this.toastService.success(response.data.isActive ? '用户已启用。' : '用户已禁用。');
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '用户状态更新失败，可能权限不足。'),
    });
  }

  private loadUsers(): void {
    this.adminService.listUsers().subscribe({
      next: (response) => {
        this.users.set(
          response.data.map((user) => ({
            ...user,
            active: Boolean(user.isActive),
            postCount: user.postCount ?? 0,
          })),
        );
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '用户列表加载失败。'),
    });
  }
}
