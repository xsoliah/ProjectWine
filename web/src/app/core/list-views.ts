/**
 * Gemeinsame, reine Logik für Tabelle, Filter, Pivot und CSV der Listen Keller, Archiv und Regale.
 * Keine Angular-Abhängigkeiten, damit alles ohne Oberfläche testbar ist.
 */

export const NO_VALUE = 'Ohne Angabe';

export type ListView = 'tiles' | 'table' | 'pivot';
export const LIST_VIEWS: readonly ListView[] = ['tiles', 'table', 'pivot'];

// ----- Spalten und Sortierung -----

export type ColumnType = 'text' | 'number' | 'date';
export type CellValue = string | number | null;

export interface Column<T> {
  key: string;
  title: string;
  type: ColumnType;
  /** Wert zum Sortieren; null/leer = ohne Wert (steht immer am Ende). */
  value: (row: T) => CellValue;
  /** Angezeigter Text, falls vom Wert abweichend. */
  display?: (row: T) => string;
  /** In der Standardauswahl sichtbar. */
  defaultVisible: boolean;
}

export type SortDir = 'asc' | 'desc';

export function cellText<T>(column: Column<T>, row: T): string {
  if (column.display) return column.display(row);
  const value = column.value(row);
  return value === null ? '' : String(value);
}

function isEmpty(value: CellValue): boolean {
  return value === null || value === undefined || value === '';
}

const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });

/** Sortiert stabil; leere Werte stehen unabhängig von der Richtung am Ende. */
export function sortRows<T>(rows: readonly T[], column: Column<T> | undefined, dir: SortDir): T[] {
  if (!column) return [...rows];
  const sign = dir === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: column.value(row) }))
    .sort((a, b) => {
      const ea = isEmpty(a.value);
      const eb = isEmpty(b.value);
      if (ea || eb) return ea && eb ? a.index - b.index : ea ? 1 : -1;
      let cmp: number;
      if (column.type === 'text') cmp = collator.compare(String(a.value), String(b.value));
      else cmp = Number(a.value) - Number(b.value) || String(a.value).localeCompare(String(b.value));
      return cmp * sign || a.index - b.index;
    })
    .map((x) => x.row);
}

/** Sichtbare Spalten in Definitionsreihenfolge; die erste (Name) bleibt immer sichtbar. */
export function visibleColumns<T>(columns: readonly Column<T>[], keys: readonly string[] | null): Column<T>[] {
  const wanted = keys ?? columns.filter((c) => c.defaultVisible).map((c) => c.key);
  return columns.filter((c, i) => i === 0 || wanted.includes(c.key));
}

// ----- Filter -----

/** Filterzustand flach als Query-Parameter: Mehrfachauswahl mit „|“ getrennt. */
export type FilterState = Record<string, string>;

export type FilterDef<T> =
  | {
      kind: 'text';
      key: string;
      title: string;
      /** Durchsuchte Texte; Treffer, wenn der Suchtext in einem vorkommt. */
      texts: (row: T) => (string | null | undefined)[];
    }
  | {
      kind: 'multi';
      key: string;
      title: string;
      /** Werte der Zeile (Anzeigetexte); leer = „Ohne Angabe“. */
      values: (row: T) => string[];
      /** Feste Auswahlliste (sonst aus den Daten abgeleitet). */
      options?: readonly string[];
    }
  | {
      kind: 'range';
      key: string;
      title: string;
      input: 'number' | 'date';
      /** Zahl bzw. ISO-Datum (yyyy-MM-dd). */
      value: (row: T) => number | string | null;
    }
  | {
      kind: 'min';
      key: string;
      title: string;
      value: (row: T) => number | null;
      /** Wählbare Mindestwerte. */
      steps: readonly number[];
    };

export const MULTI_SEPARATOR = '|';

export function multiValues(state: FilterState, key: string): string[] {
  const raw = state[key];
  return raw ? raw.split(MULTI_SEPARATOR).filter((v) => v !== '') : [];
}

/** Query-Parameter-Namen, die ein Filter belegt. */
export function filterParamKeys<T>(def: FilterDef<T>): string[] {
  switch (def.kind) {
    case 'range':
      return [`${def.key}From`, `${def.key}To`];
    case 'min':
      return [`${def.key}Min`];
    default:
      return [def.key];
  }
}

export function activeFilterCount<T>(defs: readonly FilterDef<T>[], state: FilterState): number {
  return defs.filter((d) => filterParamKeys(d).some((k) => (state[k] ?? '') !== '')).length;
}

function normalize(text: string): string {
  return text.toLocaleLowerCase('de').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/** Wendet alle Filter an: zwischen Filtern „und“, innerhalb einer Mehrfachauswahl „oder“. */
export function filterRows<T>(rows: readonly T[], defs: readonly FilterDef<T>[], state: FilterState): T[] {
  const checks: ((row: T) => boolean)[] = [];
  for (const def of defs) {
    switch (def.kind) {
      case 'text': {
        const needle = normalize((state[def.key] ?? '').trim());
        if (needle) checks.push((row) => def.texts(row).some((t) => !!t && normalize(t).includes(needle)));
        break;
      }
      case 'multi': {
        const wanted = multiValues(state, def.key);
        if (wanted.length > 0) {
          checks.push((row) => {
            const values = def.values(row);
            const own = values.length === 0 ? [NO_VALUE] : values;
            return own.some((v) => wanted.includes(v));
          });
        }
        break;
      }
      case 'range': {
        const parse = (raw: string | undefined): number | string | null => {
          if (!raw) return null;
          if (def.input === 'date') return raw;
          const n = Number(raw);
          return Number.isFinite(n) ? n : null;
        };
        const from = parse(state[`${def.key}From`]);
        const to = parse(state[`${def.key}To`]);
        if (from !== null || to !== null) {
          checks.push((row) => {
            const raw = def.value(row);
            if (raw === null) return false;
            const value = def.input === 'date' ? String(raw).slice(0, 10) : raw;
            return (from === null || value >= from) && (to === null || value <= to);
          });
        }
        break;
      }
      case 'min': {
        const raw = state[`${def.key}Min`];
        const min = raw ? Number(raw) : NaN;
        if (Number.isFinite(min)) checks.push((row) => (def.value(row) ?? -Infinity) >= min);
        break;
      }
    }
  }
  return checks.length === 0 ? [...rows] : rows.filter((row) => checks.every((c) => c(row)));
}

/** Auswahlmöglichkeiten einer Mehrfachauswahl: feste Liste oder die in den Daten vorkommenden Werte. */
export function multiOptions<T>(
  def: Extract<FilterDef<T>, { kind: 'multi' }>,
  rows: readonly T[],
  selected: readonly string[] = [],
): string[] {
  if (def.options) return [...def.options];
  const found = new Set<string>(selected);
  let hasNone = false;
  for (const row of rows) {
    const values = def.values(row);
    if (values.length === 0) hasNone = true;
    for (const v of values) found.add(v);
  }
  const sorted = [...found].filter((v) => v !== NO_VALUE).sort(compareKeys);
  return hasNone || found.has(NO_VALUE) ? [...sorted, NO_VALUE] : sorted;
}

// ----- Pivot -----

export interface Dimension<T> {
  key: string;
  title: string;
  /** Werte der Zeile; leer = „Ohne Angabe“, mehrere Werte (z. B. Rebsorten) zählen mehrfach. */
  values: (row: T) => string[];
  /** Feste Reihenfolge der Schlüssel (übrige danach, „Ohne Angabe“ zuletzt). */
  order?: readonly string[];
}

export interface Measure<T> {
  key: string;
  title: string;
  /** Summe der Werte oder Durchschnitt der vorhandenen Werte. */
  kind: 'sum' | 'avg';
  value: (row: T) => number | null;
  format: (value: number) => string;
}

export interface PivotConfig {
  row: string;
  /** Leer = keine Spaltendimension. */
  col: string;
  measure: string;
}

export interface PivotResult {
  rowKeys: string[];
  colKeys: string[];
  /** Zellwert je `rowKey\u0000colKey`; fehlt, wenn die Zelle leer ist. */
  cells: Map<string, number>;
  rowTotals: Map<string, number>;
  colTotals: Map<string, number>;
  grand: number | null;
  /** Mindestens eine Zeile fällt in mehrere Zeilen- oder Spaltenschlüssel. */
  multiValued: boolean;
}

export function cellKey(row: string, col: string): string {
  return `${row}\u0000${col}`;
}

export const NO_COLUMN = '';
/** Einziger Spaltenschlüssel, wenn keine Spaltendimension gewählt ist. */
export const TOTAL_COLUMN = 'Gesamt';

function compareKeys(a: string, b: string): number {
  if (a === NO_VALUE || b === NO_VALUE) return a === b ? 0 : a === NO_VALUE ? 1 : -1;
  const na = Number(a);
  const nb = Number(b);
  if (a !== '' && b !== '' && Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return collator.compare(a, b);
}

function orderKeys(keys: Iterable<string>, order: readonly string[] | undefined): string[] {
  const list = [...new Set(keys)];
  if (!order) return list.sort(compareKeys);
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i < 0 ? order.length : i;
  };
  return list.sort((a, b) => {
    if (a === NO_VALUE || b === NO_VALUE) return compareKeys(a, b);
    return rank(a) - rank(b) || compareKeys(a, b);
  });
}

function aggregate<T>(rows: readonly T[], measure: Measure<T>): number | null {
  let sum = 0;
  let count = 0;
  for (const row of rows) {
    const v = measure.value(row);
    if (v === null) continue;
    sum += v;
    count++;
  }
  if (count === 0) return measure.kind === 'sum' && rows.length > 0 ? 0 : null;
  return measure.kind === 'avg' ? sum / count : sum;
}

function keysOf<T>(dim: Dimension<T> | null, row: T): string[] {
  if (!dim) return [TOTAL_COLUMN];
  const values = [...new Set(dim.values(row).filter((v) => v !== ''))];
  return values.length === 0 ? [NO_VALUE] : values;
}

/**
 * Kreuztabelle aus Zeilen- und Spaltendimension. Summen werten jede Zeile genau einmal aus, auch wenn sie
 * wegen mehrerer Werte (Rebsorten) in mehreren Zellen steht. `extraRowKeys` erzwingt Zeilen ohne Daten (Summe 0).
 */
export function pivot<T>(
  rows: readonly T[],
  rowDim: Dimension<T>,
  colDim: Dimension<T> | null,
  measure: Measure<T>,
  extraRowKeys: readonly string[] = [],
): PivotResult {
  const byCell = new Map<string, T[]>();
  const byRow = new Map<string, T[]>();
  const byCol = new Map<string, T[]>();
  let multiValued = false;
  const push = (map: Map<string, T[]>, key: string, row: T) => {
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  };
  for (const row of rows) {
    const rk = keysOf(rowDim, row);
    const ck = keysOf(colDim, row);
    if (rk.length > 1 || ck.length > 1) multiValued = true;
    for (const r of rk) {
      push(byRow, r, row);
      for (const c of ck) push(byCell, cellKey(r, c), row);
    }
    for (const c of ck) push(byCol, c, row);
  }
  const rowKeys = orderKeys([...byRow.keys(), ...extraRowKeys], rowDim.order);
  const colKeys = colDim ? orderKeys(byCol.keys(), colDim.order) : [TOTAL_COLUMN];

  const cells = new Map<string, number>();
  for (const [key, list] of byCell) {
    const value = aggregate(list, measure);
    if (value !== null) cells.set(key, value);
  }
  const rowTotals = new Map<string, number>();
  for (const key of rowKeys) {
    // Summen ohne Daten (z. B. leeres Regal) sind 0; ein Durchschnitt ohne Werte bleibt leer.
    const value = aggregate(byRow.get(key) ?? [], measure) ?? (measure.kind === 'sum' ? 0 : null);
    if (value !== null) rowTotals.set(key, value);
  }
  const colTotals = new Map<string, number>();
  for (const [key, list] of byCol) {
    const value = aggregate(list, measure);
    if (value !== null) colTotals.set(key, value);
  }
  return { rowKeys, colKeys, cells, rowTotals, colTotals, grand: aggregate(rows, measure), multiValued };
}

/** Zeilen, die zu einer Pivotzelle bzw. -summe gehören (`null` = alle). */
export function drillRows<T>(
  rows: readonly T[],
  rowDim: Dimension<T> | null,
  rowKey: string | null,
  colDim: Dimension<T> | null,
  colKey: string | null,
): T[] {
  return rows.filter(
    (row) =>
      (rowKey === null || !rowDim || keysOf(rowDim, row).includes(rowKey)) &&
      (colKey === null || !colDim || keysOf(colDim, row).includes(colKey)),
  );
}

export function pivotCsv(result: PivotResult, rowTitle: string, measure: Measure<unknown>, hasColumns: boolean): string {
  const fmt = (v: number | undefined) => (v === undefined ? '' : measure.format(v));
  const header = [rowTitle, ...result.colKeys, ...(hasColumns ? ['Gesamt'] : [])];
  const body = result.rowKeys.map((r) => [
    r,
    ...result.colKeys.map((c) => fmt(result.cells.get(cellKey(r, c)))),
    ...(hasColumns ? [fmt(result.rowTotals.get(r))] : []),
  ]);
  const total = [
    'Gesamt',
    ...result.colKeys.map((c) => fmt(result.colTotals.get(c))),
    ...(hasColumns ? [result.grand === null ? '' : measure.format(result.grand)] : []),
  ];
  return toCsv(header, [...body, total]);
}

// ----- CSV -----

/** Entschärft Zellen, die eine Tabellenkalkulation als Formel ausführen würde. */
export function csvCell(value: CellValue): string {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'number' ? String(value).replace('.', ',') : value;
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** UTF-8 mit BOM, Semikolon als Trenner (deutsches Excel). */
export function toCsv(header: readonly string[], rows: readonly (readonly CellValue[])[]): string {
  const lines = [header, ...rows].map((line) => line.map(csvCell).join(';'));
  return `﻿${lines.join('\r\n')}\r\n`;
}

export function tableCsv<T>(rows: readonly T[], columns: readonly Column<T>[]): string {
  return toCsv(
    columns.map((c) => c.title),
    rows.map((row) => columns.map((c) => cellText(c, row))),
  );
}

// ----- URL-Zustand -----

export interface ViewState {
  view: ListView;
  sort: string;
  dir: SortDir;
  /** Gewählte Spaltenschlüssel; null = Standard. */
  cols: string[] | null;
  pivot: PivotConfig;
  /** Aufgeschlüsselte Pivotzelle: gesetzte Schlüssel, „“ = nicht eingeschränkt. */
  drillRow: string | null;
  drillCol: string | null;
  filters: FilterState;
}

export interface ViewDefaults {
  pivot: PivotConfig;
  /** Zugelassene Schlüssel, um ungültige Werte zu erkennen. */
  dimensions: readonly string[];
  measures: readonly string[];
  columns: readonly string[];
}

const RESERVED = ['view', 'sort', 'dir', 'cols', 'pr', 'pc', 'pm', 'dr', 'dc'];

/** Liest den Zustand aus Query-Parametern; ungültige Werte fallen auf den Standard zurück. */
export function parseViewState<T>(
  params: Record<string, string | undefined>,
  defaults: ViewDefaults,
  filters: readonly FilterDef<T>[],
  fallbackView: ListView = 'tiles',
): ViewState {
  const view = (LIST_VIEWS as readonly string[]).includes(params['view'] ?? '') ? (params['view'] as ListView) : fallbackView;
  const sort = defaults.columns.includes(params['sort'] ?? '') ? params['sort']! : '';
  const cols = (params['cols'] ?? '')
    .split(',')
    .filter((c) => defaults.columns.includes(c));
  const row = defaults.dimensions.includes(params['pr'] ?? '') ? params['pr']! : defaults.pivot.row;
  const colRaw = params['pc'];
  const col = colRaw === 'none' ? NO_COLUMN : defaults.dimensions.includes(colRaw ?? '') ? colRaw! : defaults.pivot.col;
  const measure = defaults.measures.includes(params['pm'] ?? '') ? params['pm']! : defaults.pivot.measure;
  const state: FilterState = {};
  for (const def of filters) {
    for (const key of filterParamKeys(def)) {
      const raw = params[key];
      if (raw === undefined || raw === '') continue;
      if (def.kind === 'range' && def.input === 'number' && !Number.isFinite(Number(raw))) continue;
      if (def.kind === 'range' && def.input === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) continue;
      if (def.kind === 'min' && !Number.isFinite(Number(raw))) continue;
      state[key] = raw;
    }
  }
  return {
    view,
    sort,
    dir: params['dir'] === 'desc' ? 'desc' : 'asc',
    cols: cols.length > 0 ? cols : null,
    pivot: { row, col, measure },
    drillRow: params['dr'] ?? null,
    drillCol: params['dc'] ?? null,
    filters: state,
  };
}

/** Schreibt den Zustand als Query-Parameter; Standardwerte entfallen, `null` entfernt den Parameter. */
export function serializeViewState(state: ViewState, defaults: ViewDefaults): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const key of RESERVED) out[key] = null;
  out['view'] = state.view;
  if (state.sort) {
    out['sort'] = state.sort;
    out['dir'] = state.dir;
  }
  if (state.cols) out['cols'] = state.cols.join(',');
  if (state.pivot.row !== defaults.pivot.row) out['pr'] = state.pivot.row;
  if (state.pivot.col !== defaults.pivot.col) out['pc'] = state.pivot.col === NO_COLUMN ? 'none' : state.pivot.col;
  if (state.pivot.measure !== defaults.pivot.measure) out['pm'] = state.pivot.measure;
  if (state.drillRow !== null) out['dr'] = state.drillRow;
  if (state.drillCol !== null) out['dc'] = state.drillCol;
  return out;
}

export function filterQueryParams<T>(filters: readonly FilterDef<T>[], state: FilterState): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const def of filters) for (const key of filterParamKeys(def)) out[key] = state[key] ? state[key] : null;
  return out;
}
