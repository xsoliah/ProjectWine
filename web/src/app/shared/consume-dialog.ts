import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';
import { todayIso } from '../core/format';
import { CONSUMPTION_KINDS, counterpartyLabel } from '../core/labels';
import { ConsumptionKind, RackWine } from '../core/models';
import { freedSlotsMessage } from '../core/racks';
import { ToastService } from '../core/toast.service';
import { Modal } from './modal';
import { StarRating } from './star-rating';
import { Stepper } from './stepper';

/** Removes bottles from the cellar by drinking, selling or gifting them - or exactly the bottle in one rack slot. */
@Component({
  selector: 'app-consume-dialog',
  imports: [FormsModule, Modal, Stepper, StarRating],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [label]="title()" (closed)="closed.emit()">
      <h2>{{ title() }}</h2>
      @if (slotLabel(); as where) {
        <p class="muted">{{ wine().name }} · {{ where }}</p>
      }
      <form class="stack" (ngSubmit)="submit()">
        <div class="chips" role="group" aria-label="Art der Entnahme">
          @for (option of kinds; track option.value) {
            <button type="button" class="chip" [attr.aria-pressed]="kind() === option.value"
              (click)="kind.set(option.value)">
              {{ option.label }}
            </button>
          }
        </div>

        @if (!slotId()) {
          <div class="field">
            <span class="label">Anzahl (im Keller: {{ quantityInCellar() }})</span>
            <app-stepper [(value)]="quantity" [min]="1" [max]="quantityInCellar()" label="Anzahl Flaschen" />
          </div>
        }

        <div class="field">
          <label for="c-date">Datum</label>
          <input id="c-date" name="date" type="date" required [(ngModel)]="date" />
        </div>

        @if (kind() !== 'Drunk') {
          <div class="field">
            <label for="c-who">{{ whoLabel() }}</label>
            <input id="c-who" name="who" autocomplete="off" [(ngModel)]="counterparty" />
          </div>
        }
        @if (kind() === 'Sold') {
          <div class="field">
            <label for="c-price">Preis (€)</label>
            <input id="c-price" name="price" type="number" inputmode="decimal" step="0.01" min="0"
              [(ngModel)]="price" />
          </div>
        }
        @if (kind() === 'Drunk') {
          <div class="field">
            <span class="label">Bewertung</span>
            <app-star-rating [(value)]="rating" />
          </div>
          <div class="field">
            <label for="c-note">Verkostungsnotiz</label>
            <textarea id="c-note" name="note" rows="3" [(ngModel)]="note"></textarea>
          </div>
        }

        <div class="actions">
          <button type="button" class="btn" (click)="closed.emit()">Abbrechen</button>
          <button type="submit" class="btn btn-primary" [disabled]="!canSubmit()">
            {{ submitLabel() }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class ConsumeDialog {
  /** The wine (a full wine or the short info of a rack slot). */
  readonly wine = input.required<RackWine & { quantity?: number }>();
  /** Set to take out exactly the bottle in this slot (quantity is then always 1). */
  readonly slotId = input<string | null>(null);
  /** Shown under the title for a slot, e.g. "Keller links – Reihe 2, Spalte 3". */
  readonly slotLabel = input<string | null>(null);
  readonly consumed = output<void>();
  readonly closed = output<void>();

  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly kinds = CONSUMPTION_KINDS;
  protected readonly kind = signal<ConsumptionKind>('Drunk');
  protected readonly quantity = signal(1);
  protected readonly date = signal(todayIso());
  protected readonly counterparty = signal('');
  protected readonly price = signal<number | null>(null);
  protected readonly rating = signal<number | null>(null);
  protected readonly note = signal('');
  protected readonly busy = signal(false);

  protected readonly quantityInCellar = computed(() => this.wine().quantity ?? 1);
  protected readonly title = computed(() => (this.slotId() ? 'Flasche aus dem Fach entnehmen' : 'Flaschen entnehmen'));
  protected readonly canSubmit = computed(
    () =>
      !this.busy() &&
      this.date() !== '' &&
      (this.slotId() !== null || (this.quantity() >= 1 && this.quantity() <= this.quantityInCellar())),
  );
  protected readonly submitLabel = computed(
    () => ({ Drunk: 'Als getrunken eintragen', Sold: 'Als verkauft eintragen', Gifted: 'Als verschenkt eintragen' })[this.kind()],
  );

  protected whoLabel(): string {
    return counterpartyLabel(this.kind());
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    const kind = this.kind();
    this.busy.set(true);
    try {
      const request = {
        kind,
        quantity: this.slotId() ? 1 : this.quantity(),
        date: this.date(),
        counterparty: kind === 'Drunk' ? null : this.counterparty().trim() || null,
        price: kind === 'Sold' ? this.price() : null,
        rating: kind === 'Drunk' ? this.rating() : null,
        tastingNote: kind === 'Drunk' ? this.note().trim() || null : null,
      };
      const slotId = this.slotId();
      const entry = slotId
        ? await this.api.consumeFromSlot(slotId, request)
        : await this.api.consume(this.wine().id, request);
      const freed = freedSlotsMessage(entry.freedSlots);
      this.toast.info(freed ? `Im Archiv eingetragen. ${freed}` : 'Im Archiv eingetragen.');
      this.consumed.emit();
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
