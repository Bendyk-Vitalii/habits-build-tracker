import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TopBarComponent } from './top-bar/top-bar.component';
import { BottomNavComponent } from './bottom-nav/bottom-nav.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'ht-shell',
  standalone: true,
  imports: [RouterOutlet, TopBarComponent, BottomNavComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  isHeaderHidden = signal(false);
  isLearningPage = signal(false);
  private lastScrollTop = 0;
  private router = inject(Router);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event: NavigationEnd) => {
        this.isLearningPage.set(event.urlAfterRedirects.startsWith('/learn'));
      });
  }

  private static readonly SCROLL_THRESHOLD = 10;

  onScroll(event: Event) {
    const target = event.target as HTMLElement;
    const currentScrollTop = target.scrollTop;
    const delta = currentScrollTop - this.lastScrollTop;

    // Ignore micro-scrolls (< threshold) to avoid jitter from layout reflows
    if (Math.abs(delta) < ShellComponent.SCROLL_THRESHOLD) {
      return;
    }

    // Show header when scrolling up, hide when scrolling down past top-bar height
    if (delta > 0 && currentScrollTop > 56) {
      this.isHeaderHidden.set(true);
    } else if (delta < 0) {
      this.isHeaderHidden.set(false);
    }

    this.lastScrollTop = Math.max(0, currentScrollTop);
  }
}
