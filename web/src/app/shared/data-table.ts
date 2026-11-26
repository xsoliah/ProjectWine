import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Column, SortDir, cellText } from '../core/list-views';

/** Tabelle mit sortierbaren Spaltenköpfen; die erste Spalte (Name) bleibt beim Scrollen stehen und führt zur Einzelansicht. */
@Component({
  selector: 'app-data-table',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scroll clickable" tabindex="0" role="region" [attr.aria-label]="label()">
      <table>
        <thead>
          <tr>
            @for (c of columns(); track c.key; let i = $index) {
              <th scope="col" [class.num]="c.type === 'number'" [class.first]="i === 0" [attr.aria-sort]="ariaSort(c.key)">
                <button type="button" (click)="sortChange.emit(c.key)">
                  {{ c.title }}<span class="arrow" aria-hidden="true">{{ arrow(c.key) }}</span>
                </button>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row) {
            <tr (click)="open($event, row)">
              @for (c of columns(); track c.key; let i = $index) {
                @if (i === 0) {
                  <th scope="row" class="first"><a [routerLink]="link()(row)">{{ text(c, row) }}</a></th>
                } @else {
                  <td [class.num]="c.type === 'number'">{{ text(c, row) }}</td>
                }
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styleUrl: './tables.css',
  // Block mit min-width 0: sonst dehnt die breite Tabelle die Seite aus, statt selbst zu scrollen.
  host: { style: 'display: block; min-width: 0' },
})
export class DataTable<T> {
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly Column<T>[]>();
  readonly sortKey = input('');
  readonly sortDir = input<SortDir>('asc');
  /** Router-Ziel einer Zeile (wie bei der Kachel). */
  readonly link = input.required<(row: T) => unknown[]>();
  readonly label = input('Tabelle');
  readonly sortChange = output<string>();

  private readonly router = inject(Router);

  protected text(column: Column<T>, row: T): string {
    return cellText(column, row);
  }

  protected ariaSort(key: string): 'ascending' | 'descending' | null {
    if (key !== this.sortKey()) return null;
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  protected arrow(key: string): string {
    if (key !== this.sortKey()) return '';
    return this.sortDir() === 'asc' ? ' ▲' : ' ▼';
  }

  protected open(event: MouseEvent, row: T): void {
    if ((event.target as HTMLElement).closest('a')) return;
    void this.router.navigate(this.link()(row));
  }
}
