import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { LookupOutcome, cleanBarcode, decideLookupOutcome } from '../../core/barcode-flow';
import { BarcodeScannerService, ScannerUnavailableError } from '../../core/barcode-scanner.service';
import { errorMessage } from '../../core/errors';
import { CaptureQuota, SaveWineRequest } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/icon';
import { Stepper } from '../../shared/stepper';
import { TypeBadge } from '../../shared/type-badge';
import { WineForm } from '../wine-form/wine-form';
import { PhotoCapture } from './photo-capture';

@Component({
  selector: 'app-wine-new',
  imports: [FormsModule, Icon, Stepper, TypeBadge, WineForm, PhotoCapture],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wine-new.html',
  styleUrl: './wine-new.css',
})
export class WineNew {
  private readonly api = inject(ApiService);
  private readonly scanner = inject(BarcodeScannerService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** The combined photo + barcode form is offered only when the server has a key for the AI service. */
  protected readonly quota = signal<CaptureQuota | null>(null);
  /** The user chose to look up only a barcode (no photo). */
  protected readonly barcodeOnly = signal(false);

  constructor() {
    this.api.getCaptureQuota().then((q) => this.quota.set(q)).catch(() => this.quota.set(null));
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
