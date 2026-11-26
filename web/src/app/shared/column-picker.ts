import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Column } from '../core/list-views';

/** Spalten der Tabelle ein- und ausblenden; die erste Spalte (Name) bleibt immer sichtbar. */
@Component({
  selector: 'app-column-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="picker">
      <summary class="btn btn-small">Spalten</summary>
      <div class="panel list">
        @for (c of columns(); track c.key; let i = $index) {
          <label class="check">
            <input
              type="checkbox"
              [checked]="i === 0 || visible().includes(c.key)"
              [disabled]="i === 0"
              (change)="toggle(c.key, $any($event.target).checked)"
            />
            {{ c.title }}
          </label>
        }
        <button type="button" class="btn-link" (click)="changed.emit(null)">Standard</button>
      </div>
    </details>
  `,
  styles: `
    .picker {
      position: relative;
    }
    summary {
      display: inline-flex;
      list-style: none;
      cursor: pointer;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    .list {
      position: absolute;
      z-index: 5;
      display: grid;
      gap: var(--space-2);
      min-width: 12rem;
      margin-top: var(--space-1);
      box-shadow: var(--shadow-lifted);
    }
    .check {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 2rem;
    }
  `,
})
export class ColumnPicker<T> {
  readonly columns = input.required<readonly Column<T>[]>();
  /** Aktuell sichtbare Spaltenschlüssel. */
  readonly visible = input.required<readonly string[]>();
  /** Neue Auswahl; `null` = zurück zum Standard. */
  readonly changed = output<string[] | null>();

  protected toggle(key: string, on: boolean): void {
    const current = new Set(this.visible());
    if (on) current.add(key);
    else current.delete(key);
    this.changed.emit(this.columns().map((c) => c.key).filter((k, i) => i === 0 || current.has(k)));
  }
}
