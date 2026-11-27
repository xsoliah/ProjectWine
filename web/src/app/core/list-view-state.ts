import { computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FilterExpr,
  LegacyParam,
  andFilters,
  ensureFilterEngine,
  filterEngineReady,
  filterRecords,
  legacyFilter,
  parseFilter,
  serializeFilter,
} from './filter-expr';
import { LIST_VIEWS, ListField, ListView, toRecords } from './list-model';
import { StorageService } from './storage.service';

/** Anordnung des Pivots: Felder in Zeilen- und Spaltenbereich sowie Kennzahlen; Datumsebenen als `schlüssel:year|quarter|month`. */
export interface PivotLayout {
  rows: string[];
  cols: string[];
  data: string[];
}

export interface ListViewConfig<T> {
  /** Kennung der Liste; trennt die gemerkten Einstellungen. */
  id: string;
  /** Alle Felder der Liste (Filter-Editor, Spalten, Auswertung der Filter). */
  fields: readonly ListField<T>[];
  /** Frühere einfache Adressparameter, die in den Filterausdruck übersetzt werden. */
  legacy?: readonly LegacyParam[];
  /** Felder der Textsuche (Parameter `q`); leer = keine Suche. */
  searchKeys?: readonly string[];
}

export interface ViewState {
  view: ListView;
  search: string;
  filter: FilterExpr | null;
  filterOn: boolean;
  /** Tabelle wurde aus dem Pivot aufgeschlüsselt („Zurück zum Pivot“ ist möglich). */
  drilled: boolean;
}

const URL_WRITE_DELAY_MS = 200;

/**
 * Gemeinsamer Zustand der Listen Keller, Archiv und Regale: Ansicht, Suche und Filterausdruck. Steht in der Adresse
 * (überlebt die Einzelansicht); die Ansicht wird zusätzlich je Liste auf dem Gerät gemerkt. Muss im Injektionskontext
 * (Feld-Initialisierer einer Komponente) angelegt werden.
 */
export class ListViewState<T> {
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);

  readonly state;
  readonly view = computed(() => this.state().view);
  readonly search = computed(() => this.state().search);
  /** Der gesetzte Filterausdruck (auch ausgeschaltet). */
  readonly filter = computed(() => this.state().filter);
  readonly filterOn = computed(() => this.state().filterOn);
  /** Ausdruck, der tatsächlich wirkt (`null`, wenn ausgeschaltet oder leer). */
  readonly activeFilter = computed(() => (this.state().filterOn ? this.state().filter : null));
  readonly drilled = computed(() => this.state().drilled);
  readonly filtered = computed(() => this.activeFilter() !== null || this.state().search !== '');

  private readonly engineReady = signal(filterEngineReady());

  /** Filter vor dem Aufschlüsseln, den „Zurück“ wiederherstellt. */
  private beforeDrill: { filter: FilterExpr | null; filterOn: boolean } | null = null;

  constructor(readonly config: ListViewConfig<T>) {
    const params = inject(ActivatedRoute).snapshot.queryParams as Record<string, string | undefined>;
    const view = (LIST_VIEWS as readonly string[]).includes(params['view'] ?? '') ? (params['view'] as ListView) : 'tiles';
    const filter =
      parseFilter(params['f'], config.fields) ??
      (params['f'] ? null : legacyFilter(params, config.legacy ?? [], config.fields));
    this.state = signal<ViewState>({
      view,
      search: config.searchKeys ? (params['q'] ?? '') : '',
      filter,
      filterOn: params['fo'] !== '0',
      drilled: params['dr'] === '1',
    });
    // Die Filter-Auswertung (DevExtreme) wird erst bei einem aktiven Filter oder einer Suche nachgeladen.
    effect(() => {
      if ((this.effective() !== null || this.searchExpr() !== null) && !this.engineReady()) {
        void ensureFilterEngine().then(() => this.engineReady.set(true));
      }
    });
    const urlHasView = (LIST_VIEWS as readonly string[]).includes(params['view'] ?? '');
    void this.restoreView(urlHasView);

    const legacyKeys = (config.legacy ?? []).map((l) => l.param);
    effect((onCleanup) => {
      const s = this.state();
      const timer = setTimeout(() => {
        const query: Record<string, string | null> = {
          view: s.view,
          q: s.search || null,
          f: serializeFilter(s.filter, config.fields),
          fo: s.filter && !s.filterOn ? '0' : null,
          dr: s.drilled ? '1' : null,
        };
        for (const key of legacyKeys) query[key] = null;
        void this.router.navigate([], { queryParams: query, queryParamsHandling: 'merge', replaceUrl: true });
      }, URL_WRITE_DELAY_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  private async restoreView(urlHasView: boolean): Promise<void> {
    if (urlHasView) return;
    const stored = await this.storage.get(`view:${this.config.id}`);
    if (stored && (LIST_VIEWS as readonly string[]).includes(stored)) {
      this.state.update((s) => (s.view === 'tiles' ? { ...s, view: stored as ListView } : s));
    }
  }

  // ----- Ansicht -----

  setView(view: ListView): void {
    void this.storage.set(`view:${this.config.id}`, view);
    this.state.update((s) => ({ ...s, view, drilled: view === 'pivot' ? false : s.drilled }));
  }

  // ----- Suche und Filter -----

  setSearch(search: string): void {
    this.state.update((s) => ({ ...s, search }));
  }

  /** Setzt den Filterausdruck (schaltet ihn ein); `null` entfernt ihn. */
  setFilter(filter: FilterExpr | null): void {
    this.state.update((s) => ({ ...s, filter: filter && filter.length > 0 ? filter : null, filterOn: true }));
  }

  toggleFilter(): void {
    this.state.update((s) => ({ ...s, filterOn: !s.filterOn }));
  }

  /** Löscht Suche, Filter und die Aufschlüsselung. */
  reset(): void {
    this.beforeDrill = null;
    this.state.update((s) => ({ ...s, search: '', filter: null, filterOn: true, drilled: false }));
  }

  /** Wechselt mit der Bedingung der Pivotzelle (mit „und“ zum Filter) in die Tabelle. */
  drill(condition: FilterExpr | null): void {
    const s = this.state();
    // Ein zweites Antippen derselben Aufschlüsselung (z. B. Doppelklick) baut auf dem ursprünglichen Filter auf.
    const base = s.drilled && this.beforeDrill ? this.beforeDrill : { filter: s.filter, filterOn: s.filterOn };
    this.beforeDrill = base;
    this.state.set({
      ...s,
      view: 'table',
      drilled: true,
      filter: andFilters(base.filterOn ? base.filter : null, condition),
      filterOn: true,
    });
  }

  /** Zurück zum Pivot mit dem Filter von vor dem Aufschlüsseln. */
  endDrill(): void {
    const before = this.beforeDrill;
    this.beforeDrill = null;
    this.state.update((s) => ({
      ...s,
      view: 'pivot',
      drilled: false,
      filter: before ? before.filter : s.filter,
      filterOn: before ? before.filterOn : s.filterOn,
    }));
  }

  // ----- Daten -----

  /** Ausdruck der Textsuche (Treffer in einem der Suchfelder). */
  readonly searchExpr = computed<FilterExpr | null>(() => {
    const keys = this.config.searchKeys ?? [];
    const needle = this.state().search.trim();
    if (!needle || keys.length === 0) return null;
    return keys.reduce<unknown[]>((acc, k) => (acc.length === 0 ? [[k, 'contains', needle]] : [...acc, 'or', [k, 'contains', needle]]), []);
  });

  /** Ausdruck aus Suche und Filter, der auf die Zeilen wirkt. */
  readonly effective = computed<FilterExpr | null>(() => andFilters(this.searchExpr(), this.activeFilter()));

  /** Wendet nur die Textsuche an (die Tabelle filtert selbst, damit ihre Spaltenfilter im Filter landen). */
  applySearch(rows: readonly T[]): T[] {
    const expr = this.searchExpr();
    if (!expr || !this.engineReady()) return [...rows];
    return filterRecords(toRecords(rows, this.config.fields), expr).map((r) => r.__row);
  }

  /** Wendet Suche und Filter auf die Zeilen an (mehrwertige Felder als Text). */
  apply(rows: readonly T[]): T[] {
    const expr = this.effective();
    if (!expr || !this.engineReady()) return [...rows];
    return filterRecords(toRecords(rows, this.config.fields), expr).map((r) => r.__row);
  }
}
