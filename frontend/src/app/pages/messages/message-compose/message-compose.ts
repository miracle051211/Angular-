import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MessageService } from '../../../core/services/message.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-message-compose-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './message-compose.html',
  styleUrl: './message-compose.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComposePage {
  private readonly messageService = inject(MessageService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly form = new FormGroup({
    receiver: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    body: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(1200)],
    }),
  });

  protected send(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.messageService
      .sendMessage({ receiver: payload.receiver.trim(), content: payload.body.trim() })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastService.success('私信已发送');
          void this.router.navigate(['/messages']);
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.toastService.error(error?.error?.message ?? '发送失败，请稍后再试');
        },
      });
  }
}
