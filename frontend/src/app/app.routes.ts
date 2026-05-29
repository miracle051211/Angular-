import { Routes } from '@angular/router';

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
    path: 'posts',
    loadComponent: () =>
      import('./pages/posts/post-list/post-list').then((m) => m.PostListPage),
  },
  {
    path: 'posts/new',
    loadComponent: () =>
      import('./pages/posts/post-editor/post-editor').then((m) => m.PostEditorPage),
  },
  {
    path: 'posts/:id',
    loadComponent: () =>
      import('./pages/posts/post-detail/post-detail').then((m) => m.PostDetailPage),
  },
  {
    path: 'posts/:id/edit',
    loadComponent: () =>
      import('./pages/posts/post-editor/post-editor').then((m) => m.PostEditorPage),
  },
  {
    path: 'boards',
    loadComponent: () => import('./pages/boards/boards').then((m) => m.BoardsPage),
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
