import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/errors';
import { CaptureQuota } from '../../core/models';
import { preparePhoto } from '../../core/photo';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/icon';
import { Stepper } from '../../shared/stepper';

interface Photo {
  blob: Blob;
  url: string;
}

/**
 * Photo capture: front label photo (opens the camera on phones), optional second photo, number of bottles and a
 * note. The upload returns at once; the research runs in the background and the result appears under "Entwürfe".
 */
@Component({
  selector: 'app-photo-capture',
  imports: [FormsModule, Icon, Stepper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel stack" aria-labelledby="photo-title">
      <h2 id="photo-title">Per Foto erfassen</h2>
      <p class="muted">
        Fotografiere das Vorderetikett möglichst gerade von vorne. Die App recherchiert die Angaben im Hintergrund –
        du kannst sie währenddessen weiter benutzen.
      </p>

      <div class="photos">
        <div class="slot">
          <span class="label">Vorderetikett *</span>
          @if (front(); as p) {
            <img [src]="p.url" alt="Foto des Vorderetiketts" />
            <button type="button" class="btn btn-small" (click)="frontInput.click()">Neu aufnehmen</button>
          } @else {
            <button type="button" class="btn btn-primary take" [disabled]="preparing()" (click)="frontInput.click()">
              <app-icon name="camera" /> Foto aufnehmen
            </button>
          }
          <input #frontInput type="file" accept="image/*" capture="environment" hidden (change)="pick($event, 'front')" />
        </div>
        <div class="slot">
          <span class="label">Rückenetikett (optional)</span>
          @if (back(); as p) {
            <img [src]="p.url" alt="Foto des Rückenetiketts" />
            <div class="row">
              <button type="button" class="btn btn-small" (click)="backInput.click()">Neu aufnehmen</button>
              <button type="button" class="btn btn-small" (click)="clear('back')">Entfernen</button>
            </div>
          } @else {
            <button type="button" class="btn take" [disabled]="preparing()" (click)="backInput.click()">
              <app-icon name="camera" /> Zweites Foto
            </button>
          }
          <input #backInput type="file" accept="image/*" capture="environment" hidden (change)="pick($event, 'back')" />
        </div>
      </div>

      <div class="field">
        <span class="label">Anzahl Flaschen</span>
        <app-stepper [(value)]="bottles" [min]="1" label="Anzahl Flaschen" />
      </div>
      <div class="field">
        <label for="capture-note">Notiz (optional)</label>
        <input id="capture-note" name="note" maxlength="500" autocomplete="off" placeholder="z. B. Geschenk von Tante Gerda"
          [(ngModel)]="note" />
      </div>

      @if (quota(); as q) {
        <p class="muted" role="status">Heute noch {{ q.remaining }} {{ q.remaining === 1 ? 'Recherche' : 'Recherchen' }}.</p>
      }

      <div class="actions">
        <button type="button" class="btn" (click)="cancelled.emit()">Abbrechen</button>
        <button type="button" class="btn btn-primary" [disabled]="!front() || busy() || preparing() || quota()?.remaining === 0"
          (click)="start()">
          Recherche starten
        </button>
      </div>
    </section>
  `,
  styles: `
    .photos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      gap: var(--space-4);
    }
    .slot {
      display: grid;
      align-content: start;
      gap: var(--space-2);
    }
    .slot img {
      width: 100%;
      max-height: 16rem;
      object-fit: contain;
      border-radius: var(--radius-s);
      background: var(--surface-2);
    }
    .take {
      min-height: 4rem;
    }
    .label {
      font-weight: 600;
    }
  `,
})
export class PhotoCapture {
  readonly quota = input<CaptureQuota | null>(null);
  readonly cancelled = output<void>();

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly front = signal<Photo | null>(null);
  protected readonly back = signal<Photo | null>(null);
  protected readonly bottles = signal(1);
  protected readonly note = signal('');
  protected readonly busy = signal(false);
  protected readonly preparing = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.release(this.front());
      this.release(this.back());
    });
  }

  protected async pick(event: Event, which: 'front' | 'back'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.preparing.set(true);
    try {
      const blob = await preparePhoto(file);
      const slot = which === 'front' ? this.front : this.back;
      this.release(slot());
      slot.set({ blob, url: URL.createObjectURL(blob) });
    } catch {
      this.toast.error('Das Foto konnte nicht gelesen werden. Bitte ein anderes Foto wählen.');
    } finally {
      this.preparing.set(false);
    }
  }

  protected clear(which: 'front' | 'back'): void {
    const slot = which === 'front' ? this.front : this.back;
    this.release(slot());
    slot.set(null);
  }

  protected async start(): Promise<void> {
    const front = this.front();
    if (!front) return;
    this.busy.set(true);
    try {
      await this.api.createCapture(front.blob, this.back()?.blob ?? null, this.bottles(), this.note().trim() || null);
      this.toast.info('Recherche gestartet – du findest den Entwurf unter „Entwürfe“.');
      await this.router.navigateByUrl('/drafts');
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private release(photo: Photo | null): void {
    if (photo) URL.revokeObjectURL(photo.url);
  }
}
