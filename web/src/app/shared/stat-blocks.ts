import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FilterExpr } from '../core/filter-expr';
import { formatNumber } from '../core/list-model';
import { StatRow, StatTile } from '../core/stats';

/** Reihe von Kennzahlkacheln der Statistik. */
@Component({
  selector: 'app-stat-tiles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: var(--space-3);
      margin: 0;
      padding: 0;
    }
    .tile {
      display: grid;
      align-content: start;
      gap: var(--space-1);
      padding: var(--space-4);
      border: 1px solid var(--line);
      border-radius: var(--radius-m);
      background: var(--surface);
    }
    dt {
      color: var(--ink-soft);
      font-size: 0.9375rem;
    }
    dd {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 600;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .hint {
      color: var(--ink-soft);
      font-size: 0.8125rem;
    }
  `,
  template: `
    <dl class="tiles">
      @for (t of tiles(); track t.key) {
        <div class="tile">
          <dt>{{ t.title }}</dt>
          <dd>{{ t.text }}</dd>
          @if (t.hint) {
            <span class="hint">{{ t.hint }}</span>
          }
        </div>
      }
    </dl>
  `,
})
export class StatTiles {
  readonly tiles = input.required<readonly StatTile[]>();
}

/** Aufteilung als einfache Liste: Bezeichnung, Flaschen, Anteil und (optional) Wert; Zeilen sind antippbar. */
@Component({
  selector: 'app-stat-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    section {
      display: grid;
      gap: var(--space-2);
    }
    h2 {
      margin: 0;
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      border: 1px solid var(--line);
      border-radius: var(--radius-m);
      background: var(--surface);
      overflow: hidden;
    }
    ul ul {
      border: 0;
      border-radius: 0;
      background: var(--surface-2);
    }
    li + li,
    ul ul {
      border-top: 1px solid var(--line);
    }
    ul ul li + li {
      border-top: 1px solid var(--line);
    }
    button {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 4.5rem 3.5rem 6.5rem;
      align-items: baseline;
      gap: var(--space-2);
      width: 100%;
      min-height: 2.75rem;
      padding: var(--space-2) var(--space-4);
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    button:hover {
      background: color-mix(in srgb, var(--accent) 8%, transparent);
    }
    ul ul button {
      padding-left: var(--space-6);
      font-size: 0.9375rem;
    }
    .label {
      overflow-wrap: anywhere;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .soft {
      color: var(--ink-soft);
    }
    @media (max-width: 520px) {
      button {
        grid-template-columns: minmax(0, 1fr) 3.5rem 3rem;
      }
      .value {
        display: none;
      }
    }
  `,
  template: `
    <section>
      <h2>{{ title() }}</h2>
      <ul>
        @for (row of rows(); track row.label) {
          <li>
            <button type="button" [attr.aria-label]="ariaLabel(row)" (click)="open.emit(row.filter)">
              <span class="label">{{ row.label }}</span>
              <span class="num">{{ bottles(row) }}</span>
              <span class="num soft">{{ row.share }} %</span>
              @if (showValue()) {
                <span class="num soft value">{{ money(row) }}</span>
              }
            </button>
            @if (row.children?.length) {
              <ul>
                @for (child of row.children; track child.label) {
                  <li>
                    <button type="button" [attr.aria-label]="ariaLabel(child, row)" (click)="open.emit(child.filter)">
                      <span class="label">{{ child.label }}</span>
                      <span class="num">{{ bottles(child) }}</span>
                      <span class="num soft">{{ child.share }} %</span>
                      @if (showValue()) {
                        <span class="num soft value">{{ money(child) }}</span>
                      }
                    </button>
                  </li>
                }
              </ul>
            }
          </li>
        }
      </ul>
    </section>
  `,
})
export class StatList {
  readonly title = input.required<string>();
  readonly rows = input.required<readonly StatRow[]>();
  readonly showValue = input(false);
  /** Bedingung der angetippten Zeile; die Seite öffnet damit die Tabelle. */
  readonly open = output<FilterExpr | null>();

  protected bottles(row: StatRow): string {
    return formatNumber('integer', row.bottles);
  }

  protected money(row: StatRow): string {
    return row.value === null ? '–' : formatNumber('currency', row.value);
  }

  protected ariaLabel(row: StatRow, parent?: StatRow): string {
    const name = parent ? `${parent.label}, ${row.label}` : row.label;
    return `${name}: ${row.bottles} Flaschen, ${row.share} Prozent. In der Tabelle anzeigen`;
  }
}
