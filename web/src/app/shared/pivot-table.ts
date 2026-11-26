import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { downloadText } from '../core/download';
import {
  Dimension,
  Measure,
  NO_COLUMN,
  PivotConfig,
  cellKey,
  pivot,
  pivotCsv,
} from '../core/list-views';

export interface PivotCellEvent {
  /** Zeilenschlüssel; `null` bei der Spaltensumme. */
  row: string | null;
  /** Spaltenschlüssel; `null` bei der Zeilensumme. */
  col: string | null;
}

/** Kreuztabelle mit Konfiguration (Zeilen, Spalten, Kennzahl), Summen und aufschlüsselbaren Zellen. */
@Component({
  selector: 'app-pivot-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config">
      <label>
        Zeilen
        <select (change)="configChange.emit({ row: $any($event.target).value })">
          @for (d of dimensions(); track d.key) {
            <option [value]="d.key" [selected]="d.key === config().row">{{ d.title }}</option>
          }
        </select>
      </label>
      <label>
        Spalten
        <select (change)="configChange.emit({ col: $any($event.target).value === 'none' ? '' : $any($event.target).value })">
          <option value="none" [selected]="config().col === noColumn">Keine</option>
          @for (d of dimensions(); track d.key) {
            <option [value]="d.key" [selected]="d.key === config().col">{{ d.title }}</option>
          }
        </select>
      </label>
      <label>
        Kennzahl
        <select (change)="configChange.emit({ measure: $any($event.target).value })">
          @for (m of measures(); track m.key) {
            <option [value]="m.key" [selected]="m.key === config().measure">{{ m.title }}</option>
          }
        </select>
      </label>
      <button type="button" class="btn btn-small" [disabled]="result().rowKeys.length === 0" (click)="exportCsv()">
        Als CSV exportieren
      </button>
    </div>

    @if (result().multiValued) {
      <p class="muted note" role="note">
        Einträge mit mehreren Werten (z. B. Rebsorten) zählen in jeder passenden Zeile bzw. Spalte mit; die Summen zählen
        sie nur einmal.
      </p>
    }

    @if (result().rowKeys.length === 0) {
      <div class="empty"><h2>Keine passenden Einträge</h2></div>
    } @else {
      <div class="scroll" tabindex="0" role="region" aria-label="Pivot">
        <table>
          <thead>
            <tr>
              <th scope="col" class="first">{{ rowDim().title }}{{ hasColumns() ? ' / ' + colTitle() : '' }}</th>
              @for (c of result().colKeys; track c) {
                <th scope="col" class="num">{{ c }}</th>
              }
              @if (hasColumns()) {
                <th scope="col" class="num">Gesamt</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (r of result().rowKeys; track r) {
              <tr>
                <th scope="row" class="first">{{ r }}</th>
                @for (c of result().colKeys; track c) {
                  <td class="num">
                    @if (value(r, c); as text) {
                      <button type="button" class="cell-button" [attr.aria-label]="r + ', ' + c + ': ' + text" (click)="cell.emit({ row: r, col: hasColumns() ? c : null })">{{ text }}</button>
                    }
                  </td>
                }
                @if (hasColumns()) {
                  <td class="num">
                    @if (rowTotal(r); as text) {
                      <button type="button" class="cell-button" [attr.aria-label]="r + ', Gesamt: ' + text" (click)="cell.emit({ row: r, col: null })">{{ text }}</button>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
          <tfoot>
            <tr class="total">
              <th scope="row" class="first">Gesamt</th>
              @for (c of result().colKeys; track c) {
                <td class="num">
                  @if (colTotal(c); as text) {
                    <button type="button" class="cell-button" [attr.aria-label]="'Gesamt, ' + c + ': ' + text" (click)="cell.emit({ row: null, col: hasColumns() ? c : null })">{{ text }}</button>
                  }
                </td>
              }
              @if (hasColumns()) {
                <td class="num">
                  <button type="button" class="cell-button" [attr.aria-label]="'Gesamtsumme: ' + grand()" (click)="cell.emit({ row: null, col: null })">{{ grand() }}</button>
                </td>
              }
            </tr>
          </tfoot>
        </table>
      </div>
    }
  `,
  styleUrl: './tables.css',
  styles: `
    :host {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
    }
    .config {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: var(--space-3);
    }
    .config label {
      display: grid;
      gap: var(--space-1);
      font-size: 0.875rem;
    }
    select {
      min-height: 2.5rem;
      padding: 0 var(--space-2);
      border: 1px solid var(--line);
      border-radius: var(--radius-s);
      background: var(--surface);
      color: var(--ink);
      font: inherit;
    }
    .note {
      margin: 0;
      font-size: 0.875rem;
    }
    tfoot .first {
      background: var(--surface-2);
    }
  `,
})
export class PivotTable<T> {
  readonly rows = input.required<readonly T[]>();
  readonly dimensions = input.required<readonly Dimension<T>[]>();
  readonly measures = input.required<readonly Measure<T>[]>();
  readonly config = input.required<PivotConfig>();
  /** Zeilen, die auch ohne Daten erscheinen sollen (Summe 0). */
  readonly extraRowKeys = input<readonly string[]>([]);
  readonly fileName = input('pivot.csv');
  readonly configChange = output<Partial<PivotConfig>>();
  readonly cell = output<PivotCellEvent>();

  protected readonly noColumn = NO_COLUMN;

  protected readonly rowDim = computed(
    () => this.dimensions().find((d) => d.key === this.config().row) ?? this.dimensions()[0],
  );
  private readonly colDim = computed(() => this.dimensions().find((d) => d.key === this.config().col) ?? null);
  protected readonly hasColumns = computed(() => this.colDim() !== null);
  protected readonly colTitle = computed(() => this.colDim()?.title ?? '');
  private readonly measure = computed(
    () => this.measures().find((m) => m.key === this.config().measure) ?? this.measures()[0],
  );

  protected readonly result = computed(() =>
    pivot(this.rows(), this.rowDim(), this.colDim(), this.measure(), this.extraRowKeys()),
  );

  protected value(row: string, col: string): string {
    const v = this.result().cells.get(cellKey(row, col));
    return v === undefined ? '' : this.measure().format(v);
  }

  protected rowTotal(row: string): string {
    const v = this.result().rowTotals.get(row);
    return v === undefined ? '' : this.measure().format(v);
  }

  protected colTotal(col: string): string {
    const v = this.result().colTotals.get(col);
    return v === undefined ? '' : this.measure().format(v);
  }

  protected grand(): string {
    const g = this.result().grand;
    return g === null ? '' : this.measure().format(g);
  }

  protected exportCsv(): void {
    const csv = pivotCsv(this.result(), this.rowDim().title, this.measure() as Measure<unknown>, this.hasColumns());
    downloadText(this.fileName(), csv);
  }
}
