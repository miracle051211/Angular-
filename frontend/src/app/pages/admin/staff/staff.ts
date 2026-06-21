import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { User } from '../../../core/models/user.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';

type StaffRole = '管理员' | '运营' | '稽查';

@Component({
  selector: 'app-admin-staff-page',
  imports: [ReactiveFormsModule],
  templateUrl: './staff.html',
  styleUrl: './staff.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStaffPage {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  protected readonly staff = signal<readonly (User & { permission: string; active: boolean })[]>([]);
  protected readonly isCreating = signal(false);
  protected readonly isCreateOpen = signal(false);
  protected readonly updatingId = signal<string | null>(null);
  protected readonly roles: readonly StaffRole[] = ['管理员', '运营', '稽查'];
  protected readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('123456', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    roleName: new FormControl<StaffRole>('运营', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    this.loadStaff();
  }

  protected toggleCreate(): void {
    this.isCreateOpen.update((value) => !value);
  }

  protected createStaff(): void {
    if (this.form.invalid || this.isCreating()) {
      this.form.markAllAsTouched();
      this.toastService.warning('请补全员工信息，邮箱和密码需要符合格式。');
      return;
    }

    this.isCreating.set(true);
    this.adminService.createStaff(this.form.getRawValue()).subscribe({
      next: (response) => {
        const user = response.data;
        this.staff.update((staff) => [this.toStaffUser(user), ...staff]);
        this.toastService.success('员工已新增。');
        this.form.reset({ username: '', email: '', password: '123456', roleName: '运营' });
        this.isCreateOpen.set(false);
        this.isCreating.set(false);
      },
      error: (error) => {
        this.toastService.error(error?.error?.message ?? '新增员工失败，可能权限不足。');
        this.isCreating.set(false);
      },
    });
  }

  protected updateRole(user: User, roleName: StaffRole): void {
    if (user.roleName === roleName || this.updatingId()) {
      return;
    }

    this.updatingId.set(user.id);
    this.adminService.updateStaffRole(user.id, roleName).subscribe({
      next: (response) => {
        this.staff.update((staff) =>
          staff.map((item) => (item.id === user.id ? this.toStaffUser(response.data) : item)),
        );
        this.toastService.success(`${user.username} 已调整为${roleName}。`);
        this.updatingId.set(null);
      },
      error: (error) => {
        this.toastService.error(error?.error?.message ?? '员工权限更新失败，可能权限不足。');
        this.updatingId.set(null);
      },
    });
  }

  private loadStaff(): void {
    this.adminService.listStaff().subscribe({
      next: (response) => this.staff.set(response.data.map((user) => this.toStaffUser(user))),
      error: (error) => this.toastService.error(error?.error?.message ?? '员工列表加载失败。'),
    });
  }

  private toStaffUser(user: User): User & { permission: string; active: boolean } {
    return {
      ...user,
      permission: user.permissions?.join(' / ') || user.roleName || '未分配',
      active: Boolean(user.isActive ?? true),
    };
  }
}
