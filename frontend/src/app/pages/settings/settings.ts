import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);

  protected readonly user = this.authService.currentUser;
  protected readonly isSavingPassword = signal(false);
  protected readonly isLoadingSettings = signal(true);
  protected readonly isSavingSettings = signal(false);
  protected readonly securityForm = new FormGroup({
    oldPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  protected readonly settingsForm = new FormGroup({
    notifyCommentReply: new FormControl(true, { nonNullable: true }),
    notifyNewMessage: new FormControl(true, { nonNullable: true }),
    notifyPostLike: new FormControl(true, { nonNullable: true }),
    notifyCommentLike: new FormControl(true, { nonNullable: true }),
    receiveEmailNotifications: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  protected updatePassword(): void {
    if (this.securityForm.invalid || this.isSavingPassword()) {
      this.securityForm.markAllAsTouched();
      return;
    }

    const { oldPassword, newPassword, confirmPassword } = this.securityForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.toastService.warning('两次输入的新密码不一致。');
      return;
    }

    this.isSavingPassword.set(true);
    this.userService.updateMyPassword({ oldPassword, newPassword }).subscribe({
      next: () => {
        this.toastService.success('密码已更新。');
        this.securityForm.reset();
        this.isSavingPassword.set(false);
      },
      error: (error) => {
        this.toastService.error(error?.error?.message ?? '密码更新失败。');
        this.isSavingPassword.set(false);
      },
    });
  }

  protected saveSettings(): void {
    if (this.isSavingSettings()) {
      return;
    }

    this.isSavingSettings.set(true);
    this.userService.updateMySettings(this.settingsForm.getRawValue()).subscribe({
      next: (response) => {
        this.settingsForm.patchValue(response.data, { emitEvent: false });
        this.toastService.success('安全权限已保存。');
        this.isSavingSettings.set(false);
      },
      error: (error) => {
        this.toastService.error(error?.error?.message ?? '安全权限保存失败。');
        this.isSavingSettings.set(false);
      },
    });
  }

  private loadSettings(): void {
    this.isLoadingSettings.set(true);
    this.userService.getMySettings().subscribe({
      next: (response) => {
        this.settingsForm.patchValue(response.data, { emitEvent: false });
        this.isLoadingSettings.set(false);
      },
      error: () => {
        this.toastService.error('账号设置加载失败。');
        this.isLoadingSettings.set(false);
      },
    });
  }
}
