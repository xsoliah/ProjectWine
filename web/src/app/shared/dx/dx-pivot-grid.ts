import './dx-setup';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked, OnInit, viewChild } from '@angular/core';
import { DxChartComponent, DxChartModule } from 'devextreme-angular/ui/chart';
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
import {
  KpiTile,
  ListKpi,
  PivotPreset,
  computeKpis,
  heatLevel,
  layoutSignature,
  pathByLabel,
  signatureOfFields,
  topValues,
} from '../../core/pivot-insights';
import { PivotData, pivotMatrix } from '../../core/pivot-matrix';
import { StorageService } from '../../core/storage.service';

type DxField = Record<string, unknown>;
interface LevelField {
  dataField?: string;
  groupInterval?: string;
}
interface UiState {
  heat: boolean;
  /** `undefined` = nach Bildschirmbreite (Handy aus). */
  chart?: boolean;
  /** `undefined` = Vorgabe der Anordnung. */
  percent?: string[];
}

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
const PERCENT_FORMAT = { type: 'percent', precision: 1 } as const;

/**
 * Pivot mit verschachtelten Feldern (DevExtreme `PivotGrid`): mehrere Zeilen- und Spaltenfelder, Zwischensummen,
 * Auf-/Zuklappen, Feldauswahl per Drag-and-drop, mehrere Kennzahlen. Dazu Kennzahlkacheln, Vorlagen, Heatmap,
 * Anteil in Prozent und ein Diagramm. Anordnung und Schalter werden je Liste auf dem Gerät gemerkt.
 */
@Component({
  selector: 'app-dx-pivot-grid',
  imports: [DxPivotGridModule, DxChartModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tiles().length > 0) {
      <dl class="kpis" aria-label="Kennzahlen der gefilterten Einträge">
        @for (tile of tiles(); track tile.key) {
          <div class="kpi">
            <dt>{{ tile.title }}</dt>
            <dd>{{ tile.text }}</dd>
          </div>
        }
      </dl>
    }
    <div class="pivot-tools">
      @if (presets().length > 1) {
        <label class="preset">
          <span>Ansicht</span>
          <select (change)="applyPreset($any($event.target).value)">
            @for (p of presets(); track p.id) {
              <option [value]="p.id" [selected]="p.id === activeId()">{{ p.title }}</option>
            }
            @if (activeId() === 'custom') {
              <option value="custom" selected disabled>Eigene Anordnung</option>
            }
          </select>
        </label>
      }
      <button type="button" class="btn btn-small" (click)="expandAll(true)">Alle Ebenen aufklappen</button>
      <button type="button" class="btn btn-small" (click)="expandAll(false)">Alle Ebenen zuklappen</button>
      <button type="button" class="btn btn-small" [attr.aria-pressed]="totals()" (click)="toggleTotals()">Zwischensummen</button>
      <button type="button" class="btn btn-small" [attr.aria-pressed]="ui().heat" (click)="toggleHeat()">Heatmap</button>
      <button type="button" class="btn btn-small" [attr.aria-pressed]="chartOn()" (click)="toggleChart()">Diagramm</button>
      @for (m of dataFields(); track m.key) {
        <button type="button" class="btn btn-small" [attr.aria-pressed]="percentSet().has(m.key)" (click)="togglePercent(m.key)">
          Anteil %: {{ m.caption }}
        </button>
      }
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
      @if (chartOn()) {
        <div class="chart">
          <dx-chart
            [commonSeriesSettings]="{ type: 'stackedbar' }"
            [legend]="{ visible: true, horizontalAlignment: 'center', verticalAlignment: 'bottom' }"
            [tooltip]="{ enabled: true }"
            [size]="{ height: 320 }"
            [elementAttr]="{ 'aria-label': 'Diagramm: ' + label() }"
            (onPointClick)="pointClick($any($event))"
          />
          <ul class="sr-only" aria-label="Werte des Diagramms">
            @for (line of summary(); track line) {
              <li>{{ line }}</li>
            }
          </ul>
        </div>
      }
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
        (onCellPrepared)="cellPrepared($any($event))"
        (onContentReady)="applyHeat()"
      />
    }
  `,
  styles: `
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
      gap: var(--space-2);
      margin: 0 0 var(--space-3);
    }
    .kpi {
      padding: var(--space-2) var(--space-3);
      border: 1px solid rgba(128, 128, 128, 0.35);
      border-radius: var(--radius-m);
    }
    .kpi dt {
      font-size: 0.8rem;
      opacity: 0.75;
    }
    .kpi dd {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 600;
    }
    .pivot-tools {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }
    .preset {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }
    .chart {
      margin-bottom: var(--space-3);
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
  /** Vorgabe-Anordnung. */
  readonly layout = input.required<PivotLayout>();
  /** Vorbereitete Anordnungen zur Auswahl (die erste ist die Vorgabe). */
  readonly presets = input<readonly PivotPreset[]>([]);
  /** Kennzahlkacheln über dem Pivot. */
  readonly kpis = input<readonly ListKpi<P>[]>([]);
  readonly storageId = input.required<string>();
  readonly label = input('Pivot');
  readonly fileName = input('pivot.csv');
  /** Aufschlüsseln: Filterbedingung der angetippten Zelle (`null` = alle Einträge). */
  readonly drill = output<FilterExpr | null>();

  private readonly storage = inject(StorageService);
  private readonly grid = viewChild(DxPivotGridComponent);
  private readonly chart = viewChild(DxChartComponent);

  protected readonly totals = signal(true);
  protected readonly ui = signal<UiState>({ heat: true });
  /** Anordnung einer gewählten Vorlage (sonst gilt `layout`). */
  private readonly override = signal<PivotLayout | null>(null);
  private readonly effLayout = computed(() => this.override() ?? this.layout());
  /** Aktuelle Anordnung der Pivot-Felder (zum Erkennen der gewählten Vorlage). */
  private readonly signature = signal('');
  protected readonly activeId = computed(
    () => this.presets().find((p) => layoutSignature(p.layout) === this.signature())?.id ?? 'custom',
  );
  protected readonly percentSet = computed(() => new Set(this.ui().percent ?? this.effLayout().percent ?? []));
  protected readonly chartOn = computed(() => this.ui().chart ?? (typeof window === 'undefined' || window.innerWidth >= 768));
  protected readonly dataFields = signal<{ key: string; caption: string }[]>([]);
  protected readonly summary = signal<string[]>([]);
  protected readonly tiles = computed<KpiTile[]>(() => computeKpis(this.rows(), this.kpis()));

  /** Mehrwertige Felder, die im Pivot in Zeilen/Spalten stehen (Zeilen werden dafür aufgefächert). */
  private readonly fan = signal<ReadonlySet<string>>(new Set());
  private readonly savedState = signal<unknown>(undefined);
  private readonly stateLoaded = signal(false);
  protected readonly dataSource = signal<PivotGridDataSource | null>(null);
  private heatCells: { el: HTMLElement; value: number | null; m: number }[] = [];

  private readonly pivotFields = computed(() => this.fields().filter((f) => f.pivot));
  private readonly multiKeys = computed(() => new Set(this.pivotFields().filter(isMulti).map((f) => f.key)));
  /** Ob die „Top N“ der gewählten Anordnung gerade gelten (nur solange die Anordnung unverändert ist). */
  private readonly topActive = computed(() => {
    const layout = this.effLayout();
    return !!layout.top && this.signature() === layoutSignature(layout);
  });

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
      // Neu aufbauen, wenn sich Daten, Felder, die Auffächerung oder die Geltung von „Top N“ ändern.
      this.rows();
      this.fan();
      this.topActive();
      if (!this.stateLoaded()) return;
      untracked(() => this.build(this.savedState()));
    });
    effect((onCleanup) => {
      // Diagramm mit dem Pivot verknüpfen: es folgt Auf-/Zuklappen und Filtern.
      const grid = this.grid();
      const chart = this.chart();
      if (!grid || !chart || !this.dataSource()) return;
      const dispose = (grid.instance as unknown as { bindChart(c: unknown, o: unknown): (() => void) | undefined }).bindChart(
        chart.instance,
        { alternateDataFields: false, dataFieldsDisplayMode: 'splitPanes', inverted: true },
      );
      onCleanup(() => dispose?.());
    });
  }

  private storageKey(): string {
    return `pivot:${this.storageId()}`;
  }

  private uiKey(): string {
    return `pivotui:${this.storageId()}`;
  }

  private async loadState(): Promise<void> {
    try {
      const raw = await this.storage.get(this.storageKey());
      this.savedState.set(raw ? JSON.parse(raw) : undefined);
    } catch {
      this.savedState.set(undefined);
    }
    try {
      const raw = await this.storage.get(this.uiKey());
      const parsed = raw ? (JSON.parse(raw) as Partial<UiState>) : null;
      if (parsed && typeof parsed === 'object') {
        this.ui.set({
          heat: parsed.heat !== false,
          chart: typeof parsed.chart === 'boolean' ? parsed.chart : undefined,
          percent: Array.isArray(parsed.percent) ? parsed.percent.map(String) : undefined,
        });
      }
    } catch {
      // ungültig: Vorgabe
    }
    // Gemerkte Auffächerung gleich mit aufbauen, sonst wäre die erste Anzeige ohne Rebsorten.
    this.stateLoaded.set(true);
  }

  private saveUi(): void {
    void this.storage.set(this.uiKey(), JSON.stringify(this.ui()));
  }

  private build(state: unknown): void {
    const fields = this.pivotFields();
    const measures = this.measures();
    const layout = this.effLayout();
    let records = toRecords(this.rows(), fields, measures, this.fan());
    if (!state) this.signature.set(layoutSignature(layout));
    if (layout.top && this.topActive()) {
      const keep = new Set(topValues(records, layout.top.field, MEASURE_PREFIX + layout.top.measure, layout.top.n));
      records = records.filter((r) => keep.has(r[layout.top!.field]));
    }
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
          this.applyModes(ds);
          return;
        } catch {
          // ungültiger gemerkter Zustand: Vorgabe bleibt
        }
      }
      this.changed(ds);
    });
    this.dataSource.set(ds);
  }

  /** Nach jeder Änderung: Auffächerung prüfen, Anordnung merken und Anzeige-Zusammenfassungen auffrischen. */
  private changed(ds: PivotGridDataSource): void {
    if (this.dataSource() !== ds) return;
    this.syncFan(ds);
    const state = ds.state();
    this.savedState.set(state);
    void this.storage.set(this.storageKey(), JSON.stringify(state));
    const dx = ds.fields() as { area?: string; areaIndex?: number; dataField?: string; groupName?: string; caption?: string }[];
    this.signature.set(signatureOfFields(dx, MEASURE_PREFIX));
    this.dataFields.set(
      dx
        .filter((f) => f.area === 'data' && f.dataField)
        .sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0))
        .map((f) => ({ key: f.dataField!.slice(MEASURE_PREFIX.length), caption: f.caption ?? '' })),
    );
    this.summary.set(this.summarize(ds));
  }

  private summarize(ds: PivotGridDataSource): string[] {
    try {
      const data = (ds as unknown as { getData(): PivotData }).getData();
      const column = data.grandTotalColumnIndex ?? 0;
      const fmt = (v: unknown): string => (typeof v === 'number' ? v.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : String(v ?? ''));
      return (data.rows ?? [])
        .filter((r) => r.index !== undefined)
        .slice(0, 10)
        .map((r) => {
          const cell = data.values?.[r.index!]?.[column] as unknown;
          const value = Array.isArray(cell) ? cell.map(fmt).join(' / ') : fmt(cell);
          return `${r.text ?? String(r.value ?? '')}: ${value}`;
        });
    } catch {
      return [];
    }
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
    const layout = this.effLayout();
    const percent = untracked(() => this.percentSet());
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
      // Die erste Zeilenebene darf nach einer Kennzahl sortiert sein (größte zuerst).
      const bySummary =
        layout.sort && layout.rows[0] === f.key
          ? { sortBySummaryField: MEASURE_PREFIX + layout.sort.measure, sortOrder: layout.sort.dir }
          : { sortingMethod: (a: { value: unknown }, b: { value: unknown }) => compareValues(a.value, b.value, order) };
      out.push({
        ...base,
        dataType: f.type,
        customizeText: (cell: { value: unknown; valueText: string }) => (cell.value === null || cell.value === undefined ? NO_VALUE : cell.valueText),
        ...bySummary,
      });
    }
    this.measures().forEach((m) => {
      const index = layout.data.indexOf(m.key);
      const share = percent.has(m.key);
      out.push({
        dataField: MEASURE_PREFIX + m.key,
        caption: m.title,
        dataType: 'number',
        summaryType: m.kind,
        format: share ? PERCENT_FORMAT : NUMBER_FORMATS[m.format],
        ...(share ? { summaryDisplayMode: 'percentOfGrandTotal' } : {}),
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

  protected toggleHeat(): void {
    this.ui.update((u) => ({ ...u, heat: !u.heat }));
    this.saveUi();
    const ds = this.dataSource();
    if (ds) void ds.load();
  }

  protected toggleChart(): void {
    this.ui.update((u) => ({ ...u, chart: !this.chartOn() }));
    this.saveUi();
  }

  /** Anteilsanzeige und Format der Kennzahlen nach dem Wiederherstellen des Zustands wieder auf den Schalterstand bringen. */
  private applyModes(ds: PivotGridDataSource): void {
    const percent = this.percentSet();
    for (const f of ds.fields() as { index: number; dataField?: string; area?: string }[]) {
      if (!f.dataField?.startsWith(MEASURE_PREFIX)) continue;
      const measure = this.measures().find((m) => MEASURE_PREFIX + m.key === f.dataField);
      if (!measure) continue;
      const share = percent.has(measure.key);
      ds.field(f.index, {
        summaryDisplayMode: share ? 'percentOfGrandTotal' : (null as never),
        format: share ? PERCENT_FORMAT : NUMBER_FORMATS[measure.format],
      } as never);
    }
  }

  protected togglePercent(key: string): void {
    const ds = this.dataSource();
    if (!ds) return;
    const next = new Set(this.percentSet());
    const on = !next.has(key);
    if (on) next.add(key);
    else next.delete(key);
    this.ui.update((u) => ({ ...u, percent: [...next] }));
    this.saveUi();
    const measure = this.measures().find((m) => m.key === key);
    const field = (ds.fields() as { index: number; dataField?: string }[]).find((f) => f.dataField === MEASURE_PREFIX + key);
    if (!measure || !field) return;
    ds.field(field.index, {
      summaryDisplayMode: on ? 'percentOfGrandTotal' : (null as never),
      format: on ? PERCENT_FORMAT : NUMBER_FORMATS[measure.format],
    } as never);
    void ds.load();
  }

  protected applyPreset(id: string): void {
    const preset = this.presets().find((p) => p.id === id);
    if (!preset) return;
    this.useLayout(preset.layout);
  }

  protected reset(): void {
    this.totals.set(true);
    this.useLayout(null);
  }

  /** Setzt die Anordnung neu (Vorlage oder Vorgabe) und verwirft die gemerkte Anordnung der Felder. */
  private useLayout(layout: PivotLayout | null): void {
    void this.storage.remove(this.storageKey());
    this.savedState.set(undefined);
    this.override.set(layout);
    this.ui.update((u) => ({ ...u, percent: undefined }));
    this.saveUi();
    this.fan.set(new Set());
    this.build(undefined);
  }

  // ----- Heatmap -----

  protected cellPrepared(e: {
    area?: string;
    cell?: { value?: unknown; rowType?: string; columnType?: string; dataIndex?: number };
    cellElement?: unknown;
  }): void {
    const cell = e.cell;
    if (e.area !== 'data' || !cell || cell.rowType !== 'D' || cell.columnType !== 'D') return;
    const raw = e.cellElement as { 0?: HTMLElement } | HTMLElement | undefined;
    const el = (raw && '0' in raw ? raw[0] : raw) as HTMLElement | undefined;
    if (!el?.classList) return;
    this.heatCells.push({ el, value: typeof cell.value === 'number' ? cell.value : null, m: cell.dataIndex ?? 0 });
  }

  /** Färbt die gesammelten Datenzellen nach ihrem Wert (je Kennzahl getrennt skaliert). */
  protected applyHeat(): void {
    const cells = this.heatCells;
    this.heatCells = [];
    const on = this.ui().heat;
    const range = new Map<number, { min: number; max: number }>();
    for (const c of cells) {
      if (c.value === null) continue;
      const r = range.get(c.m);
      if (!r) range.set(c.m, { min: c.value, max: c.value });
      else {
        r.min = Math.min(r.min, c.value);
        r.max = Math.max(r.max, c.value);
      }
    }
    for (const c of cells) {
      c.el.classList.remove('pv-heat-1', 'pv-heat-2', 'pv-heat-3', 'pv-heat-4');
      const r = range.get(c.m);
      const level = on && r ? heatLevel(c.value, r.min, r.max) : 0;
      if (level > 0) c.el.classList.add(`pv-heat-${level}`);
    }
  }

  // ----- Aufschlüsseln -----

  /** Felder je Ebene eines Bereichs; eine Datumsgruppe zählt als drei Ebenen (Jahr, Quartal, Monat). */
  private levelFields(area: 'row' | 'column'): LevelField[] {
    const ds = this.dataSource();
    if (!ds) return [];
    const all = ds.fields() as { area?: string; areaIndex?: number; dataField?: string; groupName?: string; groupInterval?: string; groupIndex?: number }[];
    const out: LevelField[] = [];
    for (const f of all.filter((x) => x.area === area).sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0))) {
      if (f.groupName && !f.dataField) {
        all
          .filter((x) => x.groupName === f.groupName && x.groupInterval)
          .sort((a, b) => (a.groupIndex ?? 0) - (b.groupIndex ?? 0))
          .forEach((x) => out.push({ dataField: x.dataField, groupInterval: x.groupInterval }));
      } else out.push({ dataField: f.dataField, groupInterval: f.groupInterval });
    }
    return out;
  }

  private emitDrill(rowPath: unknown[], columnPath: unknown[], rowFields: LevelField[] = [], columnFields: LevelField[] = []): void {
    const items = (path: unknown[], fields: LevelField[]): PathItem[] =>
      path.map((value, i) => ({
        key: String(fields[i]?.dataField ?? ''),
        interval: fields[i]?.groupInterval as PathItem['interval'],
        value,
      }));
    this.drill.emit(drillFilter([...items(rowPath, rowFields), ...items(columnPath, columnFields)], this.fields()));
  }

  protected cellClick(e: {
    area?: string;
    cell?: { path?: unknown[]; rowPath?: unknown[]; columnPath?: unknown[] };
    rowFields?: LevelField[];
    columnFields?: LevelField[];
    event?: { target?: EventTarget | null };
  }): void {
    const cell = e.cell;
    if (!cell || !e.area) return;
    // Das Auf-/Zuklappen einer Ebene schlüsselt nicht auf.
    if ((e.event?.target as HTMLElement | null)?.closest?.('.dx-expand-icon-container')) return;
    const rowPath = e.area === 'row' ? (cell.path ?? []) : e.area === 'data' ? (cell.rowPath ?? []) : [];
    const columnPath = e.area === 'column' ? (cell.path ?? []) : e.area === 'data' ? (cell.columnPath ?? []) : [];
    this.emitDrill(rowPath, columnPath, e.rowFields, e.columnFields);
  }

  /** Ein Balken schlüsselt wie die entsprechende Pivotzelle auf: Zeile aus der Achsenbeschriftung, Spalte aus der Reihe. */
  protected pointClick(e: { target?: { originalArgument?: unknown; argument?: unknown; series?: { name?: unknown } } }): void {
    const ds = this.dataSource();
    const target = e.target;
    if (!ds || !target) return;
    const data = (ds as unknown as { getData(): PivotData }).getData();
    const rowPath = pathByLabel(data.rows ?? [], String(target.originalArgument ?? target.argument ?? '')) ?? [];
    const columnPath = pathByLabel(data.columns ?? [], String(target.series?.name ?? '')) ?? [];
    this.emitDrill(rowPath, columnPath, this.levelFields('row'), this.levelFields('column'));
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
