import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { STATUS_LABELS, isRunning } from '../../core/capture';
import { CaptureCountsService } from '../../core/capture-counts.service';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage } from '../../core/errors';
import { AuthImage } from '../../core/images';
import { CaptureSummary } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/icon';

const REFRESH_MS = 5000;

/** Photo capture drafts: waiting, being researched, finished or failed. */
@Component({
  selector: 'app-drafts',
  imports: [RouterLink, Icon, AuthImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './drafts.css',
  template: `
    <div class="page stack">
      <div class="page-head">
        <h1>Entwürfe</h1>
        <a class="btn btn-primary" routerLink="/wines/new"><app-icon name="camera" /> Neues Foto</a>
      </div>

      @if (error(); as text) {
        <div class="banner error" role="alert">
          {{ text }} <button type="button" class="btn-link" (click)="load()">Erneut laden</button>
        </div>
      }

      @if (loading()) {
        <p class="muted" role="status">Entwürfe werden geladen …</p>
      } @else if (drafts().length === 0 && !error()) {
        <div class="empty">
          <app-icon name="inbox" />
          <h2>Keine Entwürfe</h2>
          <p>Erfasse einen Wein per Foto – die Recherche läuft im Hintergrund und landet hier.</p>
          <a class="btn btn-primary" routerLink="/wines/new">Wein hinzufügen</a>
        </div>
      } @else {
        <ul class="drafts" aria-live="polite">
          @for (d of drafts(); track d.id) {
            <li class="panel draft" [attr.data-status]="d.status">
              <img class="thumb" [appAuthImage]="d.labelPreviewImageId ?? d.frontImageId"
                [alt]="d.name ? 'Etikett von ' + d.name : 'Foto des Etiketts'" />
              <div class="info">
                <span class="name">
                  @if (d.name) { {{ d.name }}@if (d.vintage !== null) { {{ ' ' + d.vintage }} } }
                  @else { <span class="muted">{{ d.status === 'Ready' ? 'Unbekannter Wein' : 'Noch nicht erkannt' }}</span> }
                </span>
                <span class="status">
                  @if (running(d)) { <span class="spinner" aria-hidden="true"></span> }
                  {{ label(d) }} · {{ d.bottleCount }} {{ d.bottleCount === 1 ? 'Flasche' : 'Flaschen' }}
                </span>
                @if (d.error) { <span class="err">{{ d.error }}</span> }
              </div>
              <div class="tools">
                @if (d.status === 'Ready') {
                  <a class="btn btn-small btn-primary" [routerLink]="['/drafts', d.id]">Prüfen</a>
                }
                @if (d.status === 'Failed' || d.status === 'Ready') {
                  <button type="button" class="btn btn-small" [disabled]="busy()" (click)="retry(d)">Erneut recherchieren</button>
                }
                <button type="button" class="btn btn-small" [disabled]="busy()" (click)="discard(d)">Verwerfen</button>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class Drafts {
  private readonly api = inject(ApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly counts = inject(CaptureCountsService);
  private readonly toast = inject(ToastService);

  protected readonly drafts = signal<CaptureSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  private readonly anyRunning = computed(() => this.drafts().some((d) => isRunning(d.status)));
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.load();
    inject(DestroyRef).onDestroy(() => this.stopTimer());
  }

  protected running(d: CaptureSummary): boolean {
    return isRunning(d.status);
  }

  protected label(d: CaptureSummary): string {
    return STATUS_LABELS[d.status];
  }

  protected async load(): Promise<void> {
    this.stopTimer();
    try {
      this.drafts.set(await this.api.listCaptures());
      this.error.set(null);
      void this.counts.refresh();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
      // Running drafts update themselves while the page is open.
      if (this.anyRunning()) this.timer = setTimeout(() => void this.load(), REFRESH_MS);
    }
  }

  protected async retry(d: CaptureSummary): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Erneut recherchieren?',
      message: 'Die Recherche startet neu und zählt auf dein Tageslimit.',
      confirmLabel: 'Recherchieren',
    });
    if (!ok) return;
    await this.run(() => this.api.retryCapture(d.id), 'Recherche neu gestartet.');
  }

  protected async discard(d: CaptureSummary): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Entwurf verwerfen?',
      message: 'Der Entwurf wird samt Fotos gelöscht.',
      confirmLabel: 'Verwerfen',
      danger: true,
    });
    if (!ok) return;
    await this.run(() => this.api.discardCapture(d.id), 'Entwurf verworfen.');
  }

  private async run(action: () => Promise<unknown>, done: string): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      this.toast.info(done);
      await this.load();
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private stopTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
