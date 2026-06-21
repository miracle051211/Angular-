import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isSubmitting = signal(false);
  protected readonly isSendingCaptcha = signal(false);
  protected readonly isRegisterOpen = signal(false);

  protected readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    captcha: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
  });

  constructor() {
    const timer = window.setTimeout(() => this.isRegisterOpen.set(true), 220);
    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
  }

  protected toggleRegister(): void {
    this.isRegisterOpen.update((value) => !value);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.warning('请把注册信息填写完整。');
      return;
    }

    this.isSubmitting.set(true);
    this.authService
      .register({
        username: this.form.controls.username.value,
        email: this.form.controls.email.value,
        password: this.form.controls.password.value,
        captcha: this.form.controls.captcha.value,
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('注册成功，欢迎进洞天。');
          void this.router.navigate(['/home']);
        },
        error: (error) => this.toastService.error(error?.error?.message ?? '注册失败，请稍后再试。'),
      });
  }

  protected sendCaptcha(): void {
    const emailControl = this.form.controls.email;
    emailControl.markAsTouched();
    if (emailControl.invalid || this.isSendingCaptcha()) {
      this.toastService.warning('请先填写有效邮箱。');
      return;
    }

    this.isSendingCaptcha.set(true);
    this.authService
      .sendCaptcha({ email: emailControl.value, type: 'register' })
      .pipe(finalize(() => this.isSendingCaptcha.set(false)))
      .subscribe({
        next: () => this.toastService.success('验证码已发送，请查看邮箱。'),
        error: (error) => this.toastService.error(error?.error?.message ?? '验证码发送失败。'),
      });
  }
}
