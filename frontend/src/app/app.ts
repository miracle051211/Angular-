import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  NgZone,
  afterNextRender,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly ropeFrames = new WeakMap<SVGPathElement, number>();
  private readonly currentUrl = signal(this.router.url);
  private readonly isNavSolid = signal(false);
  private readonly isNavHidden = signal(false);

  protected readonly navItems = signal<readonly NavItem[]>([
    { label: '首页', path: '/home', exact: true },
    { label: '帖子', path: '/posts', exact: true },
    { label: '板块', path: '/boards', exact: false },
    { label: '发帖', path: '/posts/new', exact: true },
  ]);

  protected readonly isAuthPage = computed(() =>
    ['/login', '/register'].some((path) => this.currentUrl().startsWith(path)),
  );
  protected readonly isHomePage = computed(() => this.currentUrl().startsWith('/home'));
  protected readonly hasScrolled = computed(() => this.isNavSolid());
  protected readonly shouldHideNav = computed(() => this.isNavHidden());

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });

    afterNextRender(() => this.setupSmoothScroll());
  }

  private setupSmoothScroll(): void {
    this.ngZone.runOutsideAngular(() => {
      let previousScrollY = window.scrollY || 0;
      let smoothScrollFrame = 0;
      let targetScrollY = window.scrollY || 0;
      let isSmoothScrolling = false;
      let lastNavSolid = previousScrollY > 16;
      let lastNavHidden = false;

      const setNavState = (solid: boolean, hidden: boolean) => {
        if (solid === lastNavSolid && hidden === lastNavHidden) {
          return;
        }

        lastNavSolid = solid;
        lastNavHidden = hidden;

        this.ngZone.run(() => {
          this.isNavSolid.set(solid);
          this.isNavHidden.set(hidden);
        });
      };

      const updateScroll = () => {
        const nextScrollY = window.scrollY || 0;
        const delta = nextScrollY - previousScrollY;
        let nextHidden = lastNavHidden;

        if (nextScrollY < 24) {
          nextHidden = false;
        } else if (delta > 8) {
          nextHidden = true;
        } else if (delta < -8) {
          nextHidden = false;
        }

        setNavState(nextScrollY > 16, nextHidden);
        previousScrollY = nextScrollY;
      };

      const clampScroll = (value: number) => {
        const maxScroll = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        );

        return Math.min(Math.max(value, 0), maxScroll);
      };

      const animateSmoothScroll = () => {
        const currentScrollY = window.scrollY || 0;
        const distance = targetScrollY - currentScrollY;

        if (Math.abs(distance) < 0.5) {
          window.scrollTo(0, targetScrollY);
          isSmoothScrolling = false;
          smoothScrollFrame = 0;
          return;
        }

        window.scrollTo(0, currentScrollY + distance * 0.095);
        smoothScrollFrame = window.requestAnimationFrame(animateSmoothScroll);
      };

      const handleWheel = (event: WheelEvent) => {
        if (
          event.ctrlKey ||
          event.metaKey ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          return;
        }

        event.preventDefault();
        if (!isSmoothScrolling) {
          targetScrollY = window.scrollY || 0;
        }

        targetScrollY = clampScroll(targetScrollY + event.deltaY);

        if (!isSmoothScrolling) {
          isSmoothScrolling = true;
          smoothScrollFrame = window.requestAnimationFrame(animateSmoothScroll);
        }
      };

      updateScroll();
      window.addEventListener('scroll', updateScroll, { passive: true });
      window.addEventListener('wheel', handleWheel, { passive: false });
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', updateScroll);
        window.removeEventListener('wheel', handleWheel);
        window.cancelAnimationFrame(smoothScrollFrame);
      });
    });
  }

  protected playNavRope(event: MouseEvent): void {
    const link = event.currentTarget as HTMLElement;
    const paths = Array.from(link.querySelectorAll<SVGPathElement>('.nav-line path'));

    paths.forEach((path, index) => this.animateRopePath(path, index));
  }

  protected popNavText(event: MouseEvent): void {
    const link = event.currentTarget as HTMLElement;
    const text = link.querySelector<HTMLElement>('.nav-text');

    if (!text) {
      return;
    }

    text.classList.remove('is-popping');
    void text.offsetWidth;
    text.classList.add('is-popping');
  }

  private animateRopePath(path: SVGPathElement, index: number): void {
    const previousFrame = this.ropeFrames.get(path);

    if (previousFrame) {
      window.cancelAnimationFrame(previousFrame);
    }

    const start = performance.now();
    const duration = 1040 + index * 80;
    const amplitude = index === 0 ? 5.75 : 4.25;
    const frequency = index === 0 ? 20.2 : 18.9;
    const damping = index === 0 ? 3.85 : 3.7;

    const draw = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const seconds = elapsed / 1000;
      const settle = 1 - progress;
      const displacement =
        -amplitude * Math.exp(-damping * seconds) * Math.sin(frequency * seconds) * settle;
      const controlY = 7 + displacement;

      path.setAttribute('d', `M 0 7 Q 5 ${controlY.toFixed(3)} 10 7`);

      if (progress < 1) {
        this.ropeFrames.set(path, window.requestAnimationFrame(draw));
        return;
      }

      path.setAttribute('d', 'M 0 7 Q 5 7 10 7');
      this.ropeFrames.delete(path);
    };

    this.ropeFrames.set(path, window.requestAnimationFrame(draw));
  }
}
