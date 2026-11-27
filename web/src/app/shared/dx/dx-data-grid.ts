import './dx-setup';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DxDataGridComponent, DxDataGridModule } from 'devextreme-angular/ui/data-grid';
import { downloadText } from '../../core/download';
import { FilterExpr } from '../../core/filter-expr';
import { ListField, cellText, columnFields, isMulti, toCsv, toRecords } from '../../core/list-model';
import { StorageService } from '../../core/storage.service';

const NARROW_PX = 600;

/** Tabelle mit Spaltenfiltern (Filterzeile, Werteliste mit Häufigkeit), Sortierung, Spaltenwahl und CSV-Export. */
@Component({
  selector: 'app-dx-data-grid',
  imports: [DxDataGridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid-tools">
      <button type="button" class="btn btn-small" [attr.aria-pressed]="filterRow()" (click)="filterRow.set(!filterRow())">
        Filterzeile
      </button>
      <button type="button" class="btn btn-small" (click)="resetLayout()">Spalten zurücksetzen</button>
      <button type="button" class="btn btn-small" [disabled]="rows().length === 0" (click)="exportCsv()">
        Als CSV exportieren
      </button>
    </div>
    <dx-data-grid
      [dataSource]="records()"
      [columns]="columns()"
      [filterValue]="$any(filter())"
      [filterSyncEnabled]="true"
      [filterRow]="{ visible: filterRow() }"
      [headerFilter]="{ visible: true }"
      [columnChooser]="{ enabled: true, mode: 'select', title: 'Spalten wählen' }"
      [columnFixing]="{ enabled: true }"
      [paging]="{ enabled: false }"
      [sorting]="{ mode: 'single' }"
      [stateStoring]="stateStoring"
      [allowColumnResizing]="true"
      [columnAutoWidth]="true"
      [showBorders]="true"
      [hoverStateEnabled]="true"
      noDataText="Keine Einträge"
      [elementAttr]="{ 'aria-label': label() }"
      (onOptionChanged)="optionChanged($event)"
      (onRowClick)="rowClick($event)"
    />
  `,
  styles: `
    .grid-tools {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }
  `,
  host: { style: 'display: block; min-width: 0' },
})
export class DxDataGrid<T> {
  readonly rows = input.required<readonly T[]>();
  readonly fields = input.required<readonly ListField<T>[]>();
  /** Wirkender Filterausdruck (Spaltenfilter der Tabelle sind Teil davon). */
  readonly filter = input<FilterExpr | null>(null);
  readonly link = input.required<(row: T) => unknown[]>();
  /** Kennung der Liste für die gemerkte Spaltenauswahl und Sortierung. */
  readonly storageId = input.required<string>();
  readonly label = input('Tabelle');
  readonly fileName = input('liste.csv');
  readonly filterChange = output<FilterExpr | null>();

  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly grid = viewChild(DxDataGridComponent);

  protected readonly filterRow = signal(typeof window === 'undefined' || window.innerWidth >= NARROW_PX);
  protected readonly records = computed(() => toRecords(this.rows(), this.fields()));

  private readonly storageKey = computed(() => `grid:${this.storageId()}`);
  protected readonly stateStoring = {
    enabled: true,
    type: 'custom' as const,
    // Filter stehen in der Adresse; gemerkt werden Spalten (Sichtbarkeit, Reihenfolge, Breite) und Sortierung.
    customLoad: async () => {
      try {
        const raw = await this.storage.get(this.storageKey());
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    },
    customSave: (state: Record<string, unknown>) => {
      const { filterValue, searchText, pageIndex, selectedRowKeys, focusedRowKey, ...rest } = state as Record<string, unknown> & {
        columns?: Record<string, unknown>[];
      };
      void [filterValue, searchText, pageIndex, selectedRowKeys, focusedRowKey];
      const columns = (rest['columns'] as Record<string, unknown>[] | undefined)?.map((c) => {
        const { filterValue: _v, filterValues: _vs, filterType: _t, selectedFilterOperation: _o, ...keep } = c;
        void [_v, _vs, _t, _o];
        return keep;
      });
      void this.storage.set(this.storageKey(), JSON.stringify({ ...rest, columns }));
    },
  };

  protected readonly columns = computed(() => {
    return columnFields(this.fields()).map((f, index) => {
      const column: Record<string, unknown> = {
        dataField: f.key,
        caption: f.title,
        dataType: f.type,
        visible: f.column === 'default',
        allowHiding: index !== 0,
        allowSearch: false,
      };
      if (index === 0) {
        column['fixed'] = true;
        column['cellTemplate'] = (container: HTMLElement, info: { data: { __row: T }; text: string }) =>
          this.linkCell(container, info.data.__row, info.text);
      } else if (f.display || f.valueText) {
        column['cellTemplate'] = (container: HTMLElement, info: { data: { __row: T } }) => {
          container.textContent = cellText(f, info.data.__row);
        };
      }
      if (f.format === 'currency') column['format'] = { type: 'currency', currency: 'EUR', precision: 2 };
      if (f.type === 'date') column['format'] = { type: 'shortDate' };
      if (isMulti(f)) {
        column['allowHeaderFiltering'] = false;
        column['filterOperations'] = ['contains', 'notcontains'];
        column['defaultSelectedFilterOperation'] = 'contains';
      } else if (f.type !== 'date') {
        column['headerFilter'] = {
          // Werte samt Häufigkeit beim Öffnen aus den aktuellen Daten (ändert nicht die Spaltendefinition).
          dataSource: (options: { dataSource: unknown }) => {
            options.dataSource = valueList(f, this.records());
          },
          search: { enabled: true },
        };
      }
      return column;
    });
  });

  private linkCell(container: HTMLElement, row: T, text: string): void {
    const anchor = document.createElement('a');
    const target = this.link()(row);
    anchor.href = this.router.serializeUrl(this.router.createUrlTree(target));
    anchor.textContent = text;
    anchor.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      void this.router.navigate(target);
    });
    container.replaceChildren(anchor);
  }

  protected optionChanged(e: { fullName?: string; value?: unknown }): void {
    if (e.fullName !== 'filterValue') return;
    const next = Array.isArray(e.value) && e.value.length > 0 ? (e.value as FilterExpr) : null;
    if (JSON.stringify(next) !== JSON.stringify(this.filter())) this.filterChange.emit(next);
  }

  protected rowClick(e: { rowType?: string; data?: { __row: T }; event?: Event }): void {
    if (e.rowType !== 'data' || !e.data) return;
    if ((e.event?.target as HTMLElement | undefined)?.closest('a')) return;
    void this.router.navigate(this.link()(e.data.__row));
  }

  protected resetLayout(): void {
    const instance = this.grid()?.instance;
    if (!instance) return;
    instance.beginUpdate();
    columnFields(this.fields()).forEach((f, i) => {
      instance.columnOption(f.key, { visible: f.column === 'default', visibleIndex: i, sortOrder: undefined, sortIndex: undefined, width: undefined });
    });
    instance.endUpdate();
    void this.storage.remove(this.storageKey());
  }

  /** CSV der sichtbaren Zeilen und Spalten in angezeigter Reihenfolge. */
  protected exportCsv(): void {
    const instance = this.grid()?.instance;
    if (!instance) return;
    const byKey = new Map(this.fields().map((f) => [f.key, f]));
    const shown = instance
      .getVisibleColumns()
      .map((c) => byKey.get(String(c.dataField)))
      .filter((f): f is ListField<T> => !!f);
    const rows = instance
      .getVisibleRows()
      .filter((r) => r.rowType === 'data')
      .map((r) => (r.data as { __row: T }).__row);
    downloadText(
      this.fileName(),
      toCsv(
        shown.map((f) => f.title),
        rows.map((row) => shown.map((f) => cellText(f, row))),
      ),
    );
  }
}

/** Werte einer Spalte mit Häufigkeit für die Werteliste im Spaltenkopf (feste Reihenfolge, sonst alphabetisch/numerisch). */
function valueList<T>(field: ListField<T>, records: readonly Record<string, unknown>[]) {
  const counts = new Map<unknown, number>();
  for (const r of records) {
    const v = r[field.key] ?? null;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const rank = (v: unknown) => {
    const i = field.order ? field.order.indexOf(String(v)) : -1;
    return i < 0 ? (field.order?.length ?? 0) : i;
  };
  const items = [...counts.entries()].filter(([v]) => v !== null).sort(([a], [b]) => {
    if (field.order && rank(a) !== rank(b)) return rank(a) - rank(b);
    return field.type === 'number' ? Number(a) - Number(b) : String(a).localeCompare(String(b), 'de');
  });
  const list = items.map(([value, count]) => ({ text: `${value} (${count})`, value }));
  if (counts.has(null)) list.push({ text: `(Leer) (${counts.get(null)})`, value: null as never });
  return list;
}
