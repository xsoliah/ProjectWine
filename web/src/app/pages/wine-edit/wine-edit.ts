import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/errors';
import { SaveWineRequest, Wine, WineFormInitial } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { WineForm } from '../wine-form/wine-form';

@Component({
  selector: 'app-wine-edit',
  imports: [WineForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head"><h1>Wein bearbeiten</h1></div>
      @if (error(); as text) {
        <div class="banner error" role="alert">{{ text }}</div>
      }
      @if (initial(); as w) {
        <app-wine-form
          [initial]="w"
          [minQuantity]="0"
          [busy]="busy()"
          submitLabel="Änderungen speichern"
          (saved)="save($event)"
          (cancelled)="back()"
        />
      }
    </div>
  `,
})
export class WineEdit {
  readonly id = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly wine = signal<Wine | null>(null);
  protected readonly error = signal<string | null>(null);
  /** The form takes the origin by name. */
  protected readonly initial = computed<WineFormInitial | null>(() => {
    const w = this.wine();
    return w
      ? {
          ...w,
          country: w.country?.name ?? null,
          region: w.region?.name ?? null,
          grapes: w.grapes.map((g) => ({ name: g.name, percent: g.percent })),
        }
      : null;
  });
  protected readonly busy = signal(false);

  constructor() {
    queueMicrotask(() => void this.load());
  }

  protected back(): void {
    void this.router.navigate(['/wines', this.id()]);
  }

  protected async save(request: SaveWineRequest): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.updateWine(this.id(), request);
      this.toast.info('Änderungen gespeichert.');
      this.back();
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      this.wine.set(await this.api.getWine(this.id()));
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
