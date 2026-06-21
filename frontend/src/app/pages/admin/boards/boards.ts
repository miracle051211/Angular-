import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AdminBoard, AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-boards-page',
  imports: [ReactiveFormsModule],
  templateUrl: './boards.html',
  styleUrl: './boards.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBoardsPage {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  protected readonly boards = signal<readonly (AdminBoard & { active: boolean })[]>([]);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    this.loadBoards();
  }

  protected toggleBoard(boardId: number): void {
    const board = this.boards().find((item) => item.id === boardId);

    if (!board) {
      return;
    }

    this.adminService.setBoardActive(boardId, !board.active).subscribe({
      next: (response) => {
        this.boards.update((boards) =>
          boards.map((item) =>
            item.id === boardId ? { ...item, ...response.data, active: response.data.isActive } : item,
          ),
        );
        this.toastService.success(response.data.isActive ? '板块已启用。' : '板块已停用。');
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '板块状态更新失败，可能权限不足。'),
    });
  }

  protected createBoard(): void {
    if (this.form.invalid) {
      this.toastService.warning('请填写板块名称。');
      return;
    }

    this.adminService.createBoard(this.form.controls.name.value.trim()).subscribe({
      next: (response) => {
        this.boards.update((boards) => [{ ...response.data, active: response.data.isActive }, ...boards]);
        this.form.reset();
        this.toastService.success('板块已创建。');
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '板块创建失败，可能权限不足。'),
    });
  }

  private loadBoards(): void {
    this.adminService.listBoards().subscribe({
      next: (response) => {
        this.boards.set(response.data.map((board) => ({ ...board, active: board.isActive })));
      },
      error: (error) => this.toastService.error(error?.error?.message ?? '板块列表加载失败。'),
    });
  }
}


