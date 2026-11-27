import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';
import { PlacementSuggestion } from '../core/models';
import { MiniGrid, isSlotConflict, miniGrid, suggestedRackIds, suggestionSummary } from '../core/placement';
import { ToastService } from '../core/toast.service';
import { Modal } from './modal';

/**
 * "Einlagern": proposes free rack slots for not yet placed bottles with a short reason and a small preview.
 * Nothing is placed until the user confirms; "Selbst wählen" and "Später" leave the bottles as they are.
 */
@Component({
  selector: 'app-placement-step',
  imports: [Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal label="Einlagern" (closed)="later.emit()">
      <h2>{{ count() === 1 ? 'Flasche einlagern' : count() + ' Flaschen einlagern' }}</h2>
      <p class="muted">{{ wineName() }}</p>

      @if (loading()) {
        <p class="muted" role="status">Vorschlag wird berechnet …</p>
      } @else if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      } @else if (suggestion(); as s) {
        @if (s.slots.length > 0) {
          <p class="reason">{{ s.reason }}</p>
          <p class="where"><strong>{{ summary() }}</strong></p>
          @for (g of grids(); track g.rackId) {
            <div class="mini" role="img" [attr.aria-label]="'Vorschau ' + g.rackName">
              @for (r of g.rows; track r.row) {
                <div class="mini-row">
                  <span class="mini-label">R{{ r.row }}</span>
                  @for (c of r.cells; track c.column) {
                    <span class="cell" [class.suggested]="c.state === 'suggested'" [class.taken]="c.state === 'taken'"></span>
                  }
                </div>
              }
            </div>
          }
          @if (s.unplaceable > 0) {
            <p class="warn">
              Für {{ s.unplaceable }} {{ s.unplaceable === 1 ? 'Flasche' : 'Flaschen' }} ist kein Platz.
            </p>
          }
        } @else {
          <p class="muted">{{ s.reason }}</p>
        }
      }

      <div class="actions">
        <button type="button" class="btn" (click)="later.emit()" [disabled]="busy()">Später</button>
        <button type="button" class="btn" (click)="manual.emit(firstRackId())" [disabled]="busy()">Selbst wählen</button>
        <button type="button" class="btn btn-primary" (click)="accept()" [disabled]="busy() || !canAccept()">
          Einlagern
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .reason { margin: var(--space-3) 0 var(--space-1); }
    .where { margin: 0 0 var(--space-3); }
    .warn { color: var(--warning, var(--ink)); }
    .error { color: var(--danger, #b3261e); }
    .mini { display: grid; gap: 3px; margin-bottom: var(--space-3); }
    .mini-row { display: flex; align-items: center; gap: 3px; }
    .mini-label { width: 2rem; font-size: 0.75rem; color: var(--ink-muted, var(--ink)); }
    .cell { flex: 1 1 0; max-width: 1.5rem; height: 1rem; border-radius: 3px; border: 1px solid var(--line); }
    .cell.taken { background: var(--line); }
    .cell.suggested { background: var(--accent, #7a1f3d); border-color: var(--accent, #7a1f3d); }
  `,
})
export class PlacementStep {
  readonly wineId = input.required<string>();
  readonly wineName = input.required<string>();
  /** Bottles to place (the ones just added, at most the not placed ones). */
  readonly count = input.required<number>();

  /** The bottles were placed. */
  readonly placed = output<void>();
  /** Skipped ("Später" or dialog closed); the bottles stay not placed. */
  readonly later = output<void>();
  /** The user wants to pick a slot on the rack page; carries the rack to open (or null). */
  readonly manual = output<string | null>();

  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly suggestion = signal<PlacementSuggestion | null>(null);
  protected readonly grids = signal<MiniGrid[]>([]);
  protected readonly summary = computed(() => suggestionSummary(this.suggestion()?.slots ?? []));
  protected readonly canAccept = computed(() => (this.suggestion()?.slots.length ?? 0) > 0);
  protected readonly firstRackId = computed(() => this.suggestion()?.slots[0]?.rackId ?? null);

  constructor() {
    queueMicrotask(() => void this.load());
  }

  protected async accept(): Promise<void> {
    const s = this.suggestion();
    if (!s || s.slots.length === 0) return;
    this.busy.set(true);
    try {
      await this.api.placeBottles(
        s.wineId,
        s.slots.map((x) => ({ rackId: x.rackId, row: x.row, column: x.column })),
      );
      this.toast.info(s.slots.length === 1 ? 'Flasche eingelagert.' : `${s.slots.length} Flaschen eingelagert.`);
      this.placed.emit();
    } catch (error) {
      if (isSlotConflict(error)) {
        this.toast.info('Ein Fach wurde inzwischen belegt. Hier ist ein neuer Vorschlag.');
        await this.load();
      } else {
        this.toast.error(errorMessage(error));
      }
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const s = await this.api.getPlacementSuggestion(this.wineId(), this.count());
      const racks = await Promise.all(suggestedRackIds(s.slots).map((id) => this.api.getRack(id)));
      this.grids.set(racks.map((r) => miniGrid(r, s.slots)));
      this.suggestion.set(s);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
