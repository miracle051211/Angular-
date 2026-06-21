import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
  readonly duration: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private nextId = 1;
  readonly messages = signal<readonly ToastMessage[]>([]);

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  dismiss(id: number): void {
    this.messages.update((messages) => messages.filter((message) => message.id !== id));
  }

  private show(message: string, kind: ToastKind): void {
    const id = this.nextId++;
    const duration = kind === 'error' ? 5200 : 3600;
    this.messages.update((messages) => [...messages.slice(-2), { id, kind, message, duration }]);
    window.setTimeout(() => this.dismiss(id), duration);
  }
}
