import { computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Column,
  Dimension,
  FilterDef,
  FilterState,
  ListView,
  LIST_VIEWS,
  Measure,
  PivotConfig,
  ViewDefaults,
  ViewState,
  drillRows,
  filterQueryParams,
  filterRows,
  parseViewState,
  serializeViewState,
  sortRows,
  visibleColumns,
} from './list-views';
import { StorageService } from './storage.service';

export interface ListViewConfig<T> {
  /** Kennung der Liste; trennt gemerkte Ansicht und Spalten. */
  id: string;
  filters: readonly FilterDef<T>[];
  columns: readonly Column<T>[];
  dimensions: readonly Dimension<T>[];
  measures: readonly Measure<T>[];
  /** Vorgabe der Pivot-Konfiguration. */
  pivot: PivotConfig;
}

/** Wert „keine Einschränkung“ bei einer aufgeschlüsselten Summe (Zeile bzw. Spalte). */
export const DRILL_ALL = '*';

const URL_WRITE_DELAY_MS = 200;

/**
 * Gemeinsamer Zustand der Listen Keller, Archiv und Regale: Ansicht, Filter, Sortierung, Spalten und
 * Pivot-Konfiguration. Steht in der URL (überlebt die Einzelansicht); Ansicht und Spalten werden zusätzlich je Liste
 * im Gerät gemerkt. Muss im Injektionskontext (Feld-Initialisierer einer Komponente) angelegt werden.
 */
export class ListViewState<T> {
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  readonly defaults: ViewDefaults;

  readonly state: ReturnType<typeof signal<ViewState>>;
  readonly view = computed(() => this.state().view);
  readonly filters = computed(() => this.state().filters);
  readonly pivotConfig = computed(() => this.state().pivot);
  readonly sortKey = computed(() => this.state().sort);
  readonly sortDir = computed(() => this.state().dir);
  readonly drilled = computed(() => this.state().drillRow !== null || this.state().drillCol !== null);

  constructor(readonly config: ListViewConfig<T>) {
    this.defaults = {
      pivot: config.pivot,
      dimensions: config.dimensions.map((d) => d.key),
      measures: config.measures.map((m) => m.key),
      columns: config.columns.map((c) => c.key),
    };
    const params = inject(ActivatedRoute).snapshot.queryParams as Record<string, string | undefined>;
    this.state = signal(parseViewState(params, this.defaults, config.filters));
    const urlHasView = (LIST_VIEWS as readonly string[]).includes(params['view'] ?? '');
    const urlHasCols = (params['cols'] ?? '') !== '';

    void this.restore(urlHasView, urlHasCols);

    effect((onCleanup) => {
      const s = this.state();
      const timer = setTimeout(() => {
        void this.router.navigate([], {
          queryParams: { ...serializeViewState(s, this.defaults), ...filterQueryParams(config.filters, s.filters) },
          replaceUrl: true,
        });
      }, URL_WRITE_DELAY_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  private async restore(urlHasView: boolean, urlHasCols: boolean): Promise<void> {
    const id = this.config.id;
    if (!urlHasView) {
      const stored = await this.storage.get(`view:${id}`);
      if (stored && (LIST_VIEWS as readonly string[]).includes(stored)) {
        this.state.update((s) => (s.view === 'tiles' ? { ...s, view: stored as ListView } : s));
      }
    }
    if (!urlHasCols) {
      const stored = await this.storage.get(`cols:${id}`);
      const keys = (stored ?? '').split(',').filter((k) => this.defaults.columns.includes(k));
      if (keys.length > 0) this.state.update((s) => (s.cols ? s : { ...s, cols: keys }));
    }
  }

  // ----- Ansicht -----

  setView(view: ListView): void {
    void this.storage.set(`view:${this.config.id}`, view);
    this.state.update((s) => ({
      ...s,
      view,
      // Die Aufschlüsselung gehört zur Tabelle; im Pivot gilt sie nicht mehr.
      drillRow: view === 'pivot' ? null : s.drillRow,
      drillCol: view === 'pivot' ? null : s.drillCol,
    }));
  }

  // ----- Spalten und Sortierung -----

  /** Erstes Antippen aufsteigend, weiteres absteigend, danach wieder aufsteigend. */
  toggleSort(key: string): void {
    this.state.update((s) => ({
      ...s,
      sort: key,
      dir: s.sort === key && s.dir === 'asc' ? 'desc' : 'asc',
    }));
  }

  setColumns(keys: string[] | null): void {
    if (keys) void this.storage.set(`cols:${this.config.id}`, keys.join(','));
    else void this.storage.remove(`cols:${this.config.id}`);
    this.state.update((s) => ({ ...s, cols: keys }));
  }

  readonly columns = computed(() => visibleColumns(this.config.columns, this.state().cols));

  // ----- Filter -----

  setFilter(key: string, value: string): void {
    this.state.update((s) => {
      const filters = { ...s.filters };
      if (value === '') delete filters[key];
      else filters[key] = value;
      return { ...s, filters };
    });
  }

  setFilters(filters: FilterState): void {
    this.state.update((s) => ({ ...s, filters }));
  }

  /** Setzt alle Filter und die Aufschlüsselung zurück. */
  resetFilters(): void {
    this.state.update((s) => ({ ...s, filters: {}, drillRow: null, drillCol: null }));
  }

  // ----- Pivot -----

  setPivot(change: Partial<PivotConfig>): void {
    this.state.update((s) => ({ ...s, pivot: { ...s.pivot, ...change } }));
  }

  dimension(key: string): Dimension<T> | null {
    return this.config.dimensions.find((d) => d.key === key) ?? null;
  }

  /** Öffnet die zu einer Pivotzelle oder -summe gehörenden Einträge als Tabelle (`null` = alle). */
  drill(rowKey: string | null, colKey: string | null): void {
    this.state.update((s) => ({
      ...s,
      view: 'table',
      drillRow: rowKey ?? DRILL_ALL,
      drillCol: colKey ?? DRILL_ALL,
    }));
  }

  endDrill(): void {
    this.state.update((s) => ({ ...s, view: 'pivot', drillRow: null, drillCol: null }));
  }

  /** Beschreibung der aufgeschlüsselten Zelle, z. B. „Land: Italien · Weinart: Rot“. */
  readonly drillLabel = computed(() => {
    const s = this.state();
    const parts: string[] = [];
    const row = this.dimension(s.pivot.row);
    const col = this.dimension(s.pivot.col);
    if (s.drillRow !== null && s.drillRow !== DRILL_ALL && row) parts.push(`${row.title}: ${s.drillRow}`);
    if (s.drillCol !== null && s.drillCol !== DRILL_ALL && col) parts.push(`${col.title}: ${s.drillCol}`);
    return parts.length > 0 ? parts.join(' · ') : 'alle Einträge';
  });

  // ----- Daten -----

  /** Filter (und bei Tabelle/Kacheln die aufgeschlüsselte Pivotzelle) auf die Zeilen anwenden. */
  apply(rows: readonly T[]): T[] {
    const s = this.state();
    let result = filterRows(rows, this.config.filters, s.filters);
    if (s.view !== 'pivot' && (s.drillRow !== null || s.drillCol !== null)) {
      result = drillRows(
        result,
        this.dimension(s.pivot.row),
        s.drillRow === null || s.drillRow === DRILL_ALL ? null : s.drillRow,
        this.dimension(s.pivot.col),
        s.drillCol === null || s.drillCol === DRILL_ALL ? null : s.drillCol,
      );
    }
    return result;
  }

  sorted(rows: readonly T[]): T[] {
    const s = this.state();
    return sortRows(rows, this.config.columns.find((c) => c.key === s.sort), s.dir);
  }
}
