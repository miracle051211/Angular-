import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

interface AdminNavLink {
  readonly label: string;
  readonly path: string;
  readonly icon: string;
  readonly permission?: string;
}

@Component({
  selector: 'app-admin-shell-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellPage {
  private readonly authService = inject(AuthService);

  private readonly allLinks: readonly AdminNavLink[] = [
    { label: '概览', path: '/admin', icon: 'overview' },
    { label: '用户', path: '/admin/users', icon: 'users', permission: '前台用户' },
    { label: '员工', path: '/admin/staff', icon: 'staff', permission: '后台用户' },
    { label: '帖子', path: '/admin/posts', icon: 'posts', permission: '帖子' },
    { label: '评论', path: '/admin/comments', icon: 'comments', permission: '评论' },
    { label: '板块', path: '/admin/boards', icon: 'boards', permission: '板块' },
    { label: '通知', path: '/admin/announcements', icon: 'announcements', permission: '后台用户' },
    { label: '举报', path: '/admin/reports', icon: 'reports', permission: '帖子' },
  ];

  protected readonly links = computed(() => {
    const permissions = new Set(this.authService.currentUser()?.permissions ?? []);
    return this.allLinks.filter((link) => !link.permission || permissions.has(link.permission));
  });
}
