import './dx-setup';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked, OnInit, viewChild } from '@angular/core';
import { DxPivotGridComponent, DxPivotGridModule } from 'devextreme-angular/ui/pivot-grid';
import PivotGridDataSource from 'devextreme/ui/pivot_grid/data_source';
import { downloadText } from '../../core/download';
import { FilterExpr } from '../../core/filter-expr';
import {
  ListField,
  ListMeasure,
  MEASURE_PREFIX,
  NO_VALUE,
  hasMultiplicity,
  isMulti,
  toCsv,
  toRecords,
} from '../../core/list-model';
import { PivotLayout } from '../../core/list-view-state';
import { PathItem, drillFilter } from '../../core/pivot-drill';
import { pivotMatrix } from '../../core/pivot-matrix';
import { StorageService } from '../../core/storage.service';

type DxField = Record<string, unknown>;
const INTERVALS = [
  { interval: 'year', caption: 'Jahr' },
  { interval: 'quarter', caption: 'Quartal' },
  { interval: 'month', caption: 'Monat' },
] as const;

const NUMBER_FORMATS = {
  integer: { type: 'fixedPoint', precision: 0 },
  decimal1: { type: 'fixedPoint', precision: 1 },
  currency: { type: 'currency', currency: 'EUR', precision: 2 },
} as const;

/**
 * Pivot mit verschachtelten Feldern (DevExtreme `PivotGrid`): mehrere Zeilen- und Spaltenfelder, Zwischensummen,
 * Auf-/Zuklappen, Feldauswahl per Drag-and-drop, mehrere Kennzahlen. Anordnung wird je Liste auf dem Gerät gemerkt.
 */
@Component({
  selector: 'app-dx-pivot-grid',
  imports: [DxPivotGridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pivot-tools">
      <button type="button" class="btn btn-small" (click)="expandAll(true)">Alle Ebenen aufklappen</button>
      <button type="button" class="btn btn-small" (click)="expandAll(false)">Alle Ebenen zuklappen</button>
      <button type="button" class="btn btn-small" [attr.aria-pressed]="totals()" (click)="toggleTotals()">Zwischensummen</button>
      <button type="button" class="btn btn-small" (click)="reset()">Zurücksetzen</button>
      <button type="button" class="btn btn-small" [disabled]="rows().length === 0" (click)="exportCsv()">
        Als CSV exportieren
      </button>
    </div>
    @if (multiNote()) {
      <p class="muted note" role="note">
        Flaschen von Weinen mit mehreren Rebsorten zählen bei jeder Rebsorte mit; die Summen können deshalb höher sein als
        die tatsächliche Flaschenzahl.
      </p>
    }
    @if (dataSource(); as ds) {
      <dx-pivot-grid
        [dataSource]="ds"
        [allowSortingBySummary]="true"
        [allowSorting]="true"
        [allowFiltering]="true"
        [allowExpandAll]="true"
        [showBorders]="true"
        [showTotalsPrior]="'none'"
        [dataFieldArea]="'column'"
        [wordWrapEnabled]="false"
        [fieldChooser]="{ enabled: true, allowSearch: true, height: 520 }"
        [fieldPanel]="{ visible: true, showFilterFields: true, allowFieldDragging: true, showDataFields: true, showRowFields: true, showColumnFields: true }"
        [elementAttr]="{ 'aria-label': label() }"
        noDataText="Keine Einträge"
        (onCellClick)="cellClick($any($event))"
      />
    }
  `,
  styles: `
    .pivot-tools {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }
    .note {
      margin: 0 0 var(--space-2);
    }
  `,
  host: { style: 'display: block; min-width: 0' },
})
export class DxPivotGrid<P> implements OnInit {
  /** Bereits gefilterte Zeilen. */
  readonly rows = input.required<readonly P[]>();
  readonly fields = input.required<readonly ListField<P>[]>();
  readonly measures = input.required<readonly ListMeasure<P>[]>();
  readonly layout = input.required<PivotLayout>();
  readonly storageId = input.required<string>();
  readonly label = input('Pivot');
  readonly fileName = input('pivot.csv');
  /** Aufschlüsseln: Filterbedingung der angetippten Zelle (`null` = alle Einträge). */
  readonly drill = output<FilterExpr | null>();

  private readonly storage = inject(StorageService);
  private readonly grid = viewChild(DxPivotGridComponent);

  protected readonly totals = signal(true);
  /** Mehrwertige Felder, die im Pivot in Zeilen/Spalten stehen (Zeilen werden dafür aufgefächert). */
  private readonly fan = signal<ReadonlySet<string>>(new Set());
  private readonly savedState = signal<unknown>(undefined);
  private readonly stateLoaded = signal(false);
  protected readonly dataSource = signal<PivotGridDataSource | null>(null);

  private readonly pivotFields = computed(() => this.fields().filter((f) => f.pivot));
  private readonly multiKeys = computed(() => new Set(this.pivotFields().filter(isMulti).map((f) => f.key)));

  /** Hinweis nötig, wenn ein mehrwertiges Feld verwendet wird und Zeilen mehrere Werte haben. */
  protected readonly multiNote = computed(() => {
    const used = [...this.fan()];
    return used.some((key) => {
      const field = this.fields().find((f) => f.key === key);
      return field ? hasMultiplicity(this.rows(), field) : false;
    });
  });

  ngOnInit(): void {
    // Erst hier sind die Eingaben (storageId) gesetzt.
    void this.loadState();
  }

  constructor() {
    effect(() => {
      // Neu aufbauen, wenn sich Daten, Felder oder die Auffächerung ändern.
      this.rows();
      this.fan();
      if (!this.stateLoaded()) return;
      untracked(() => this.build(this.savedState()));
    });
  }

  private storageKey(): string {
    return `pivot:${this.storageId()}`;
  }

  private async loadState(): Promise<void> {
    try {
      const raw = await this.storage.get(this.storageKey());
      this.savedState.set(raw ? JSON.parse(raw) : undefined);
    } catch {
      this.savedState.set(undefined);
    }
    // Gemerkte Auffächerung gleich mit aufbauen, sonst wäre die erste Anzeige ohne Rebsorten.
    this.stateLoaded.set(true);
  }

  private build(state: unknown): void {
    const fields = this.pivotFields();
    const measures = this.measures();
    const records = toRecords(this.rows(), fields, measures, this.fan());
    const ds: PivotGridDataSource = new PivotGridDataSource({
      store: records as never,
      fields: this.dxFields() as never,
    } as never);
    // Der gemerkte Zustand lässt sich erst nach dem ersten Laden anwenden (davor überschreibt ihn die Vorgabe).
    let pending: unknown = state;
    ds.on('changed', () => {
      if (pending) {
        const restore = pending;
        pending = undefined;
        try {
          ds.state(restore as never);
          return;
        } catch {
          // ungültiger gemerkter Zustand: Vorgabe bleibt
        }
      }
      this.changed(ds);
    });
    this.dataSource.set(ds);
  }

  /** Nach jeder Änderung: Auffächerung prüfen und Anordnung merken. */
  private changed(ds: PivotGridDataSource): void {
    if (this.dataSource() !== ds) return;
    this.syncFan(ds);
    const state = ds.state();
    this.savedState.set(state);
    void this.storage.set(this.storageKey(), JSON.stringify(state));
  }

  private syncFan(ds: PivotGridDataSource): void {
    const used = new Set<string>();
    for (const f of ds.fields() as { area?: string; dataField?: string }[]) {
      if ((f.area === 'row' || f.area === 'column') && f.dataField && this.multiKeys().has(f.dataField)) used.add(f.dataField);
    }
    const current = this.fan();
    if (used.size !== current.size || [...used].some((k) => !current.has(k))) this.fan.set(used);
  }

  /** Felddefinitionen für DevExtreme aus Feldern, Kennzahlen und der Vorgabe-Anordnung. */
  private dxFields(): DxField[] {
    const layout = this.layout();
    const out: DxField[] = [];
    const place = (key: string): { area?: string; areaIndex?: number } => {
      const r = layout.rows.indexOf(key);
      if (r >= 0) return { area: 'row', areaIndex: r };
      const c = layout.cols.indexOf(key);
      return c >= 0 ? { area: 'column', areaIndex: c } : {};
    };
    for (const f of this.pivotFields()) {
      const base: DxField = { dataField: f.key, caption: f.title, ...place(f.key), sortOrder: 'asc' };
      if (f.type === 'date') {
        // Hierarchie Jahr → Quartal → Monat: die Ebenen tragen keinen Bereich, nur die Gruppe selbst.
        INTERVALS.forEach((lvl, i) =>
          out.push({
            dataField: f.key,
            caption: lvl.caption,
            groupName: f.key,
            groupInterval: lvl.interval,
            groupIndex: i,
            dataType: 'date',
            sortOrder: 'asc',
          }),
        );
        out.push({ caption: f.title, groupName: f.key, ...place(f.key) });
        continue;
      }
      const order = f.order;
      out.push({
        ...base,
        dataType: f.type,
        customizeText: (cell: { value: unknown; valueText: string }) => (cell.value === null || cell.value === undefined ? NO_VALUE : cell.valueText),
        sortingMethod: (a: { value: unknown }, b: { value: unknown }) => compareValues(a.value, b.value, order),
      });
    }
    this.measures().forEach((m) => {
      const index = layout.data.indexOf(m.key);
      out.push({
        dataField: MEASURE_PREFIX + m.key,
        caption: m.title,
        dataType: 'number',
        summaryType: m.kind,
        format: NUMBER_FORMATS[m.format],
        ...(index >= 0 ? { area: 'data', areaIndex: index } : {}),
      });
    });
    return out;
  }

  // ----- Bedienung -----

  protected toggleTotals(): void {
    const ds = this.dataSource();
    if (!ds) return;
    const next = !this.totals();
    this.totals.set(next);
    (ds.fields() as { index: number; area?: string }[]).forEach((f) => {
      if (f.area === 'row' || f.area === 'column') ds.field(f.index, { showTotals: next } as never);
    });
    void ds.load();
  }

  protected expandAll(expand: boolean): void {
    const ds = this.dataSource();
    if (!ds) return;
    (ds.fields() as { index: number; area?: string }[]).forEach((f) => {
      if (f.area === 'row' || f.area === 'column') {
        if (expand) ds.expandAll(f.index);
        else ds.collapseAll(f.index);
      }
    });
  }

  protected reset(): void {
    void this.storage.remove(this.storageKey());
    this.savedState.set(undefined);
    this.totals.set(true);
    this.fan.set(new Set());
    this.build(undefined);
  }

  protected cellClick(e: {
    area?: string;
    cell?: { path?: unknown[]; rowPath?: unknown[]; columnPath?: unknown[] };
    rowFields?: { dataField?: string; groupInterval?: string }[];
    columnFields?: { dataField?: string; groupInterval?: string }[];
    event?: { target?: EventTarget | null };
  }): void {
    const cell = e.cell;
    if (!cell || !e.area) return;
    // Das Auf-/Zuklappen einer Ebene schlüsselt nicht auf.
    if ((e.event?.target as HTMLElement | null)?.closest?.('.dx-expand-icon-container')) return;
    const rowPath = e.area === 'row' ? (cell.path ?? []) : e.area === 'data' ? (cell.rowPath ?? []) : [];
    const columnPath = e.area === 'column' ? (cell.path ?? []) : e.area === 'data' ? (cell.columnPath ?? []) : [];
    const items = (path: unknown[], fields: { dataField?: string; groupInterval?: string }[] = []): PathItem[] =>
      path.map((value, i) => ({
        key: String(fields[i]?.dataField ?? ''),
        interval: fields[i]?.groupInterval as PathItem['interval'],
        value,
      }));
    const filter = drillFilter([...items(rowPath, e.rowFields), ...items(columnPath, e.columnFields)], this.fields());
    this.drill.emit(filter);
  }

  protected async exportCsv(): Promise<void> {
    const ds = this.dataSource();
    if (!ds) return;
    const data = (ds as unknown as { getData(): Parameters<typeof pivotMatrix>[0] }).getData();
    const fields = (ds.fields() as { area?: string; caption?: string; dataField?: string; areaIndex?: number }[])
      .filter((f) => f.dataField)
      .sort((x, y) => (x.areaIndex ?? 0) - (y.areaIndex ?? 0));
    const active = fields.filter((f) => f.area === 'data').map((f) => f.caption ?? '');
    const { header, body } = pivotMatrix(data, fields, active.length > 1 ? active : []);
    downloadText(this.fileName(), toCsv(header, body));
  }
}

function compareValues(a: unknown, b: unknown, order: readonly string[] | undefined): number {
  const blankA = a === null || a === undefined || a === '';
  const blankB = b === null || b === undefined || b === '';
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
  if (order) {
    const ra = order.indexOf(String(a));
    const rb = order.indexOf(String(b));
    if (ra !== rb) return (ra < 0 ? order.length : ra) - (rb < 0 ? order.length : rb);
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'de', { numeric: true, sensitivity: 'base' });
}
