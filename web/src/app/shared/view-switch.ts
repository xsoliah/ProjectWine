import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LIST_VIEWS, ListView } from '../core/list-model';

const LABELS: Record<ListView, string> = {
  tiles: 'Kacheln',
  table: 'Tabelle',
  stats: 'Statistik',
};

/** Umschalter „Ansicht“: Kacheln, Tabelle und (wo angeboten) Statistik. */
@Component({
  selector: 'app-view-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chips" role="group" aria-label="Ansicht">
      @for (o of options(); track o.value) {
        <button type="button" class="chip" [attr.aria-pressed]="view() === o.value" (click)="changed.emit(o.value)">
          {{ o.label }}
        </button>
      }
    </div>
  `,
})
export class ViewSwitch {
  readonly view = input.required<ListView>();
  /** Angebotene Ansichten; Standard: alle. */
  readonly views = input<readonly ListView[]>(LIST_VIEWS);
  readonly changed = output<ListView>();
  protected readonly options = computed(() => this.views().map((value) => ({ value, label: LABELS[value] })));
}
