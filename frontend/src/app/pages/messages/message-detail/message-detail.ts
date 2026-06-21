import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Message } from '../../../core/models/message.model';
import { MessageService } from '../../../core/services/message.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-message-detail-page',
  imports: [RouterLink],
  templateUrl: './message-detail.html',
  styleUrl: './message-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly toastService = inject(ToastService);
  private readonly messageId = Number(this.route.snapshot.paramMap.get('id') ?? 1);

  protected readonly message = signal<Message | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.loadMessage();
  }

  private loadMessage(): void {
    this.isLoading.set(true);
    this.messageService.getMessage(this.messageId).subscribe({
      next: (response) => {
        this.message.set(response.data);
        this.isLoading.set(false);
        window.dispatchEvent(new Event('miracle-notifications-read'));
      },
      error: (error) => {
        const message = error?.error?.message ?? '私信加载失败。';
        this.errorMessage.set(message);
        this.isLoading.set(false);
        this.toastService.error(message);
      },
    });
  }
}
