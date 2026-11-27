import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth.service';
import { BarcodeScannerService } from './core/barcode-scanner.service';
import { CaptureCountsService } from './core/capture-counts.service';
import { ConfirmHost } from './shared/confirm-host';
import { Icon } from './shared/icon';
import { ScannerOverlay } from './shared/scanner-overlay';
import { ToastHost } from './shared/toast-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Icon, ToastHost, ConfirmHost, ScannerOverlay],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly scanner = inject(BarcodeScannerService);
  protected readonly captureCounts = inject(CaptureCountsService);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    // Draft counts for the navigation: on every page change and every minute while signed in.
    effect(() => {
      this.url();
      if (this.auth.isAuthenticated()) void this.captureCounts.refresh();
    });
    const timer = setInterval(() => {
      if (this.auth.isAuthenticated()) void this.captureCounts.refresh();
    }, 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected section(): 'overview' | 'cellar' | 'racks' | 'cellar-room' | 'drafts' | 'archive' | 'settings' {
    const url = this.url();
    if (url.startsWith('/drafts')) return 'drafts';
    if (url.startsWith('/cellar-room')) return 'cellar-room';
    if (url.startsWith('/racks')) return 'racks';
    if (url.startsWith('/archive')) return 'archive';
    if (url.startsWith('/settings') || url.startsWith('/origins') || url.startsWith('/grapes')) return 'settings';
    if (url.startsWith('/cellar') || url.startsWith('/wines')) return 'cellar';
    return 'overview';
  }
}
