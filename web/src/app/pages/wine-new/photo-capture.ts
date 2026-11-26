import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { readBarcodeFromImage } from '../../core/barcode-image-reader';
import { BarcodeScannerService, ScannerUnavailableError } from '../../core/barcode-scanner.service';
import { CAPTURE_CONSENT_KEY } from '../../core/capture';
import {
  BarcodeState,
  NO_BARCODE,
  applyPhotoFind,
  applyUserEdit,
  barcodeProblem,
  barcodeToSend,
} from '../../core/capture-barcode';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage } from '../../core/errors';
import { CaptureQuota, Wine } from '../../core/models';
import { preparePhoto } from '../../core/photo';
import { StorageService } from '../../core/storage.service';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/icon';
import { Stepper } from '../../shared/stepper';
import { TypeBadge } from '../../shared/type-badge';

interface Photo {
  blob: Blob;
  url: string;
}

/**
 * The one capture form: front label photo (opens the camera on phones), optional back label photo, barcode, number of
 * bottles and a note. A barcode on either photo is found automatically; it can also be scanned or typed. The upload
 * returns at once; the research runs in the background and the result appears under "Entwürfe".
 */
@Component({
  selector: 'app-photo-capture',
  imports: [FormsModule, Icon, Stepper, TypeBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel stack" aria-labelledby="photo-title">
      <h2 id="photo-title">Wein erfassen</h2>
      <p class="muted">
        Fotografiere das Vorderetikett möglichst gerade von vorne und, wenn vorhanden, das Rückenetikett – dort steht
        meist der Barcode. Die App erkennt ihn automatisch und recherchiert die Angaben im Hintergrund.
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
        <label for="capture-barcode">Barcode (optional)</label>
        <div class="row barcode-row">
          <input id="capture-barcode" name="barcode" inputmode="numeric" autocomplete="off" placeholder="z. B. 4001234567890"
            [ngModel]="barcode().code" (ngModelChange)="edit($event)" [attr.aria-invalid]="problem() ? 'true' : null"
            aria-describedby="capture-barcode-status" />
          <button type="button" class="btn" (click)="scan()"><app-icon name="scan" /> Scannen</button>
        </div>
        <p id="capture-barcode-status" class="muted status" role="status">
          @if (problem(); as text) {
            {{ text }}
          } @else if (searching() > 0) {
            Barcode wird auf dem Foto gesucht …
          } @else if (barcode().origin === 'photo') {
            Barcode auf dem Foto erkannt. Du kannst ihn ändern oder entfernen.
          } @else if (!barcode().code && (front() || back())) {
            Auf den Fotos wurde kein Barcode erkannt. Du kannst ihn scannen oder eintippen – oder ohne Barcode fortfahren.
          }
        </p>
      </div>

      @if (existing(); as wine) {
        <div class="banner existing-wine" role="status">
          <p>Diesen Wein hast du schon im Keller:</p>
          <div class="existing" [attr.data-type]="wine.type">
            <strong>{{ wine.name }}</strong>
            <span class="muted">
              @if (wine.producer) { {{ wine.producer }} }
              @if (wine.vintage !== null) { · {{ wine.vintage }} }
              · aktuell {{ wine.quantity }}
            </span>
            <app-type-badge [type]="wine.type" />
          </div>
          <div class="row">
            <app-stepper [(value)]="bottles" [min]="1" label="Anzahl neuer Flaschen" />
            <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="addToExisting(wine.id)">
              Flaschen hinzufügen
            </button>
          </div>
          <div><button type="button" class="btn-link" (click)="ignoreExisting()">Trotzdem neu erfassen</button></div>
        </div>
      }

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
        <button type="button" class="btn btn-primary"
          [disabled]="!front() || busy() || preparing() || problem() !== null || quota()?.remaining === 0" (click)="start()">
          Recherche starten
        </button>
      </div>
      <div class="or"><button type="button" class="btn-link" (click)="barcodeOnly.emit()">Nur Barcode, ohne Foto</button></div>
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
    .barcode-row {
      flex-wrap: nowrap;
    }
    .barcode-row input {
      flex: 1;
      min-width: 0;
    }
    .status {
      min-height: 1.5em;
      margin: var(--space-1) 0 0;
    }
    .existing {
      display: grid;
      justify-items: start;
      gap: var(--space-1);
      margin-block: var(--space-2);
      padding-left: var(--space-4);
      border-left: 6px solid var(--type-color);
    }
    .existing-wine p {
      margin: 0;
    }
    .or {
      text-align: center;
    }
  `,
})
export class PhotoCapture {
  readonly quota = input<CaptureQuota | null>(null);
  readonly cancelled = output<void>();
  readonly barcodeOnly = output<void>();

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly scanner = inject(BarcodeScannerService);
  private readonly confirm = inject(ConfirmService);
  private readonly storage = inject(StorageService);

  protected readonly front = signal<Photo | null>(null);
  protected readonly back = signal<Photo | null>(null);
  protected readonly bottles = signal(1);
  protected readonly note = signal('');
  protected readonly busy = signal(false);
  protected readonly preparing = signal(false);
  protected readonly barcode = signal<BarcodeState>(NO_BARCODE);
  protected readonly searching = signal(0);
  protected readonly problem = signal<string | null>(null);
  /** The wine of the cellar that has the current barcode (null when none or when the user chose to continue). */
  protected readonly existing = signal<Wine | null>(null);

  private ignoredFor: string | null = null;
  private lookedUp = '';

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
    // The barcode is read from the original photo, before it is shrunk for the upload.
    this.searching.update((n) => n + 1);
    void readBarcodeFromImage(file)
      .then((found) => this.setBarcode(applyPhotoFind(this.barcode(), found)))
      .finally(() => this.searching.update((n) => n - 1));
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

  protected edit(raw: string): void {
    this.setBarcode(applyUserEdit(raw ?? ''));
  }

  protected async scan(): Promise<void> {
    try {
      const code = await this.scanner.scan();
      if (code) this.edit(code);
    } catch (error) {
      this.toast.error(error instanceof ScannerUnavailableError ? error.message : errorMessage(error));
    }
  }

  protected ignoreExisting(): void {
    this.ignoredFor = this.barcode().code;
    this.existing.set(null);
  }

  protected async addToExisting(id: string): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.addBottles(id, this.bottles());
      this.toast.info('Flaschen hinzugefügt.');
      await this.router.navigate(['/wines', id]);
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async start(): Promise<void> {
    const front = this.front();
    if (!front) return;
    if (!(await this.ensureConsent())) return;
    this.busy.set(true);
    try {
      await this.api.createCapture(
        front.blob,
        this.back()?.blob ?? null,
        this.bottles(),
        this.note().trim() || null,
        barcodeToSend(this.barcode()),
      );
      this.toast.info('Recherche gestartet – du findest den Entwurf unter „Entwürfe“.');
      await this.router.navigateByUrl('/drafts');
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  /** First use: the photos go to an external AI service; the confirmation is remembered on this device. */
  private async ensureConsent(): Promise<boolean> {
    if ((await this.storage.get(CAPTURE_CONSENT_KEY)) === 'yes') return true;
    const ok = await this.confirm.ask({
      title: 'Fotos werden übertragen',
      message:
        'Für die Foto-Erfassung werden deine Etikettenfotos zur Auswertung an einen externen KI-Dienst (Anthropic) übertragen. ' +
        'Bitte fotografiere nur das Etikett, keine Personen oder andere private Dinge.',
      confirmLabel: 'Verstanden, weiter',
    });
    if (ok) await this.storage.set(CAPTURE_CONSENT_KEY, 'yes');
    return ok;
  }

  private setBarcode(state: BarcodeState): void {
    this.barcode.set(state);
    this.problem.set(barcodeProblem(state));
    const code = barcodeToSend(state);
    if (!code) {
      this.existing.set(null);
      this.lookedUp = '';
      return;
    }
    if (code === this.lookedUp) return;
    this.lookedUp = code;
    void this.checkCellar(code);
  }

  /** Before any research: is this wine already in the cellar? Costs no quota. */
  private async checkCellar(code: string): Promise<void> {
    try {
      const result = await this.api.lookupBarcode(code);
      if (this.lookedUp !== code) return; // the barcode changed in the meantime
      const wine = result.source === 'Cellar' ? result.existingWine : null;
      this.existing.set(wine && this.ignoredFor !== code ? wine : null);
    } catch {
      // The check is a convenience; the capture works without it.
    }
  }

  private release(photo: Photo | null): void {
    if (photo) URL.revokeObjectURL(photo.url);
  }
}
