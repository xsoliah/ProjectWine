import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { LookupOutcome, cleanBarcode, decideLookupOutcome } from '../../core/barcode-flow';
import { BarcodeScannerService, ScannerUnavailableError } from '../../core/barcode-scanner.service';
import { errorMessage } from '../../core/errors';
import { CAPTURE_CONSENT_KEY } from '../../core/capture';
import { ConfirmService } from '../../core/confirm.service';
import { CaptureQuota, SaveWineRequest } from '../../core/models';
import { StorageService } from '../../core/storage.service';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/icon';
import { Stepper } from '../../shared/stepper';
import { TypeBadge } from '../../shared/type-badge';
import { WineForm } from '../wine-form/wine-form';
import { PhotoCapture } from './photo-capture';

@Component({
  selector: 'app-wine-new',
  imports: [FormsModule, RouterLink, Icon, Stepper, TypeBadge, WineForm, PhotoCapture],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wine-new.html',
  styleUrl: './wine-new.css',
})
export class WineNew {
  private readonly api = inject(ApiService);
  private readonly scanner = inject(BarcodeScannerService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly storage = inject(StorageService);

  /** Photo capture is offered only when the server has a key for the AI service. */
  protected readonly quota = signal<CaptureQuota | null>(null);
  protected readonly photoMode = signal(false);

  constructor() {
    this.api.getCaptureQuota().then((q) => this.quota.set(q)).catch(() => this.quota.set(null));
  }

  /** First use: the photos go to an external AI service; the confirmation is remembered on this device. */
  protected async startPhoto(): Promise<void> {
    if ((await this.storage.get(CAPTURE_CONSENT_KEY)) !== 'yes') {
      const ok = await this.confirm.ask({
        title: 'Fotos werden übertragen',
        message:
          'Für die Foto-Erfassung werden deine Etikettenfotos zur Auswertung an einen externen KI-Dienst (Anthropic) übertragen. ' +
          'Bitte fotografiere nur das Etikett, keine Personen oder andere private Dinge.',
        confirmLabel: 'Verstanden, weiter',
      });
      if (!ok) return;
      await this.storage.set(CAPTURE_CONSENT_KEY, 'yes');
    }
    this.photoMode.set(true);
  }

  /** null while the user is still choosing how to add the wine. */
  protected readonly outcome = signal<LookupOutcome | null>(null);
  protected readonly manualBarcode = signal('');
  protected readonly busy = signal(false);
  protected readonly bottles = signal(1);

  protected async scan(): Promise<void> {
    try {
      const code = await this.scanner.scan();
      if (code) await this.lookup(code);
    } catch (error) {
      this.toast.error(error instanceof ScannerUnavailableError ? error.message : errorMessage(error));
    }
  }

  protected async lookupManual(): Promise<void> {
    const code = cleanBarcode(this.manualBarcode());
    if (code) await this.lookup(code);
  }

  protected withoutBarcode(): void {
    this.outcome.set({ step: 'form', prefill: {}, hint: null });
  }

  protected restart(): void {
    this.outcome.set(null);
    this.bottles.set(1);
  }

  protected async create(request: SaveWineRequest): Promise<void> {
    this.busy.set(true);
    try {
      const wine = await this.api.createWine(request);
      this.toast.info('Wein zum Keller hinzugefügt.');
      await this.router.navigate(['/wines', wine.id]);
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
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

  protected cancel(): void {
    void this.router.navigateByUrl('/cellar');
  }

  private async lookup(barcode: string): Promise<void> {
    this.busy.set(true);
    try {
      this.outcome.set(decideLookupOutcome(await this.api.lookupBarcode(barcode)));
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
