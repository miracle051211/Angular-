import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register/register').then((m) => m.RegisterPage),
  },
  {
    path: 'profile/:id',
    loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfilePage),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/notifications/notifications').then((m) => m.NotificationsPage),
  },
  {
    path: 'messages',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/messages/message-list/message-list').then((m) => m.MessageListPage),
  },
  {
    path: 'messages/send',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/messages/message-compose/message-compose').then(
        (m) => m.MessageComposePage,
      ),
  },
  {
    path: 'messages/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/messages/message-detail/message-detail').then((m) => m.MessageDetailPage),
  },
  {
    path: 'posts',
    loadComponent: () =>
      import('./pages/posts/post-list/post-list').then((m) => m.PostListPage),
  },
  {
    path: 'posts/manage',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/posts/post-management/post-management').then((m) => m.PostManagementPage),
  },
  {
    path: 'posts/:id',
    loadComponent: () =>
      import('./pages/posts/post-detail/post-detail').then((m) => m.PostDetailPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/admin-shell/admin-shell').then((m) => m.AdminShellPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/admin/dashboard/dashboard').then((m) => m.AdminDashboardPage),
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin/users/users').then((m) => m.AdminUsersPage),
      },
      {
        path: 'staff',
        loadComponent: () => import('./pages/admin/staff/staff').then((m) => m.AdminStaffPage),
      },
      {
        path: 'posts',
        loadComponent: () => import('./pages/admin/posts/posts').then((m) => m.AdminPostsPage),
      },
      {
        path: 'comments',
        loadComponent: () =>
          import('./pages/admin/comments/comments').then((m) => m.AdminCommentsPage),
      },
      {
        path: 'boards',
        loadComponent: () =>
          import('./pages/admin/boards/boards').then((m) => m.AdminBoardsPage),
      },
      {
        path: 'announcements',
        loadComponent: () =>
          import('./pages/admin/announcements/announcements').then((m) => m.AdminAnnouncementsPage),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/admin/reports/reports').then((m) => m.AdminReportsPage),
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];


