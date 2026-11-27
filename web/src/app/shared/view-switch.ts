import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ListView } from '../core/list-model';

const OPTIONS: readonly { value: ListView; label: string }[] = [
  { value: 'tiles', label: 'Kacheln' },
  { value: 'table', label: 'Tabelle' },
  { value: 'pivot', label: 'Pivot' },
];

/** Umschalter „Ansicht“: Kacheln, Tabelle oder Pivot. */
@Component({
  selector: 'app-view-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chips" role="group" aria-label="Ansicht">
      @for (o of options; track o.value) {
        <button type="button" class="chip" [attr.aria-pressed]="view() === o.value" (click)="changed.emit(o.value)">
          {{ o.label }}
        </button>
      }
    </div>
  `,
})
export class ViewSwitch {
  readonly view = input.required<ListView>();
  readonly changed = output<ListView>();
  protected readonly options = OPTIONS;
}
