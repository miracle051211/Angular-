import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly exact: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);

  protected readonly navItems = signal<readonly NavItem[]>([
    { label: '首页', path: '/home', exact: true },
    { label: '帖子', path: '/posts', exact: false },
    { label: '板块', path: '/boards', exact: false },
    { label: '发帖', path: '/posts/new', exact: true },
  ]);

  protected readonly isAuthPage = computed(() =>
    ['/login', '/register'].some((path) => this.currentUrl().startsWith(path)),
  );
  protected readonly isHomePage = computed(() => this.currentUrl().startsWith('/home'));

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }
}
