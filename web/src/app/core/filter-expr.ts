/**
 * Gemeinsamer Filterausdruck der Listen im DevExtreme-Format, beliebig verschachtelt:
 * `[["type","=","Rot"],"and",[["country","=","Italien"],"or",["country","=","Spanien"]]]`, Negation `["!", ausdruck]`.
 * Wird von Kacheln, Tabelle (DataGrid) und Statistik gleichermaßen ausgewertet und steht kompakt als JSON in der Adresse.
 */
import { FieldType, ListField, formatDateValue, parseIsoDate, toIsoDate } from './list-model';

export type FilterExpr = unknown[];

type QueryFn = typeof import('devextreme/data/query').default;
let queryFn: QueryFn | null = null;

/** Lädt die DevExtreme-Auswertung nach (erst bei einem aktiven Filter, damit die Kachelansicht ohne DevExtreme startet). */
export async function ensureFilterEngine(): Promise<void> {
  if (!queryFn) queryFn = (await import('devextreme/data/query')).default;
}

export function filterEngineReady(): boolean {
  return queryFn !== null;
}

const COMPARE_OPS = ['=', '<>', '<', '>', '<=', '>=', 'contains', 'notcontains', 'startswith', 'endswith'];
const LIST_OPS = ['between', 'anyof', 'noneof'];
const BLANK_OPS = ['isblank', 'isnotblank'];
const ALL_OPS = [...COMPARE_OPS, ...LIST_OPS, ...BLANK_OPS];
const GROUP_OPS = ['and', 'or'];

function isCondition(e: unknown): e is [string, string, unknown?] {
  return (
    Array.isArray(e) &&
    typeof e[0] === 'string' &&
    e[0] !== '!' &&
    typeof e[1] === 'string' &&
    ALL_OPS.includes(e[1]) &&
    (e.length === 3 || (e.length === 2 && BLANK_OPS.includes(e[1])))
  );
}

function isNegation(e: unknown): e is ['!', unknown] {
  return Array.isArray(e) && e.length === 2 && e[0] === '!';
}

/** Elemente einer Gruppe ohne die Verknüpfungswörter; `null`, wenn die Form keine gültige Gruppe ist. */
function groupParts(e: unknown): { items: unknown[]; op: 'and' | 'or' } | null {
  if (!Array.isArray(e) || e.length === 0 || isCondition(e) || isNegation(e)) return null;
  const items: unknown[] = [];
  let op: 'and' | 'or' | null = null;
  let expectItem = true;
  for (const part of e) {
    if (expectItem) {
      if (typeof part === 'string' && GROUP_OPS.includes(part)) return null;
      items.push(part);
      expectItem = false;
    } else if (typeof part === 'string' && GROUP_OPS.includes(part)) {
      if (op !== null && op !== part) return null; // gemischte Verknüpfung ist mehrdeutig
      op = part as 'and' | 'or';
      expectItem = true;
    } else {
      // Implizites „und“ zwischen zwei Ausdrücken.
      if (op === 'or') return null;
      op = 'and';
      items.push(part);
    }
  }
  return expectItem ? null : { items, op: op ?? 'and' };
}

/** Ob der Ausdruck wohlgeformt ist und nur bekannte Felder verwendet. */
export function isValidFilter(e: unknown, fieldKeys: ReadonlySet<string>): boolean {
  if (isCondition(e)) return fieldKeys.has(e[0]);
  if (isNegation(e)) return isValidFilter(e[1], fieldKeys);
  const group = groupParts(e);
  return group !== null && group.items.every((i) => isValidFilter(i, fieldKeys));
}

/** Entfernt leere Gruppen und löst `between`, `anyof`, `noneof`, `isblank` auf, damit `query` sie auswerten kann. */
export function normalizeFilter(e: unknown): unknown {
  if (isCondition(e)) {
    const [field, op, value] = e;
    if (op === 'between' && Array.isArray(value) && value.length === 2) {
      const lower = value[0] === null || value[0] === undefined || value[0] === '' ? null : [field, '>=', value[0]];
      const upper = value[1] === null || value[1] === undefined || value[1] === '' ? null : [field, '<=', value[1]];
      return lower && upper ? [lower, 'and', upper] : (lower ?? upper);
    }
    if (op === 'anyof' || op === 'noneof') {
      const list = Array.isArray(value) ? value : [];
      if (list.length === 0) return null;
      const parts = list.map((v) => [field, op === 'anyof' ? '=' : '<>', v]);
      return parts.reduce<unknown[]>((acc, p) => (acc.length === 0 ? [p] : [...acc, op === 'anyof' ? 'or' : 'and', p]), []);
    }
    if (op === 'isblank') return [field, '=', null];
    if (op === 'isnotblank') return [field, '<>', null];
    return e;
  }
  if (isNegation(e)) {
    const inner = normalizeFilter(e[1]);
    return inner === null ? null : ['!', inner];
  }
  const group = groupParts(e);
  if (!group) return null;
  const items = group.items.map(normalizeFilter).filter((i) => i !== null);
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  return items.reduce<unknown[]>((acc, i) => (acc.length === 0 ? [i] : [...acc, group.op, i]), []);
}

/** Verknüpft Ausdrücke mit „und“; `null`/leer entfallen. */
export function andFilters(...parts: (FilterExpr | null | undefined)[]): FilterExpr | null {
  const present = parts.filter((p): p is FilterExpr => !!p && p.length > 0);
  if (present.length === 0) return null;
  if (present.length === 1) return present[0];
  return present.reduce<unknown[]>((acc, p) => (acc.length === 0 ? [p] : [...acc, 'and', p]), []);
}

/** Ob die Datensätze durch den Ausdruck kommen (Ausdruck `null` = alle). */
export function filterRecords<R>(records: readonly R[], expr: FilterExpr | null): R[] {
  const normalized = expr ? normalizeFilter(expr) : null;
  if (!normalized) return [...records];
  if (!queryFn) throw new Error('Filter-Auswertung noch nicht geladen (ensureFilterEngine).');
  return queryFn(records as R[]).filter(normalized as never).toArray() as R[];
}

// ----- Adresse (JSON) -----

function mapValues(e: unknown, fn: (field: string, value: unknown) => unknown): unknown {
  if (isCondition(e)) {
    const [field, op, value] = e;
    return e.length === 2 ? e : [field, op, fn(field, value)];
  }
  if (isNegation(e)) return ['!', mapValues(e[1], fn)];
  if (Array.isArray(e)) return e.map((part) => (typeof part === 'string' ? part : mapValues(part, fn)));
  return e;
}

function typeOf(fields: ReadonlyMap<string, FieldType>, key: string): FieldType {
  return fields.get(key) ?? 'string';
}

/** Als kompaktes JSON für die Adresse; Datumswerte als `yyyy-MM-dd`. */
export function serializeFilter<T>(expr: FilterExpr | null, fields: readonly ListField<T>[]): string | null {
  if (!expr || expr.length === 0) return null;
  const types = new Map(fields.map((f) => [f.key, f.type]));
  const plain = mapValues(expr, (field, value) => {
    if (typeOf(types, field) !== 'date') return value;
    const conv = (v: unknown) => (v instanceof Date ? toIsoDate(v) : v);
    return Array.isArray(value) ? value.map(conv) : conv(value);
  });
  return JSON.stringify(plain);
}

/** Liest den Ausdruck aus der Adresse; ungültiges JSON, Aufbau oder Felder ergeben `null` (kein Filter). */
export function parseFilter<T>(json: string | null | undefined, fields: readonly ListField<T>[]): FilterExpr | null {
  if (!json) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const types = new Map(fields.map((f) => [f.key, f.type]));
  if (!Array.isArray(raw) || !isValidFilter(raw, new Set(types.keys()))) return null;
  const revived = mapValues(raw, (field, value) => {
    if (typeOf(types, field) !== 'date') return value;
    const conv = (v: unknown) => (typeof v === 'string' ? (parseIsoDate(v) ?? v) : v);
    return Array.isArray(value) ? value.map(conv) : conv(value);
  });
  return revived as FilterExpr;
}

// ----- Frühere einfache Parameter -----

export interface LegacyParam {
  /** Name des Query-Parameters. */
  param: string;
  /** Zielfeld. */
  key: string;
  /** `multi`: Werte mit „|“ („oder“); `from`/`to`: Grenze von/bis; `min`: Mindestwert. */
  kind: 'multi' | 'from' | 'to' | 'min';
  /** Übersetzt Werte früherer Adressen (z. B. Enum-Namen) in den Anzeigewert. */
  map?: (value: string) => string;
}

/** Übersetzt die bisherigen Einzelparameter (z. B. `type=Rot|Weiß`, `vintageFrom=2015`) in einen Ausdruck. */
export function legacyFilter<T>(
  params: Record<string, string | undefined>,
  legacy: readonly LegacyParam[],
  fields: readonly ListField<T>[],
): FilterExpr | null {
  const types = new Map(fields.map((f) => [f.key, f.type]));
  const parts: FilterExpr[] = [];
  for (const l of legacy) {
    const raw = params[l.param];
    if (!raw) continue;
    const type = typeOf(types, l.key);
    const scalar = (text: string): unknown => {
      if (type === 'number') return Number.isFinite(Number(text)) ? Number(text) : null;
      if (type === 'date') return parseIsoDate(text);
      return l.map ? l.map(text) : text;
    };
    if (l.kind === 'multi') {
      const values = raw.split('|').filter((v) => v !== '').map((v) => (l.map ? l.map(v) : v));
      const conds = values.map((v) => [l.key, '=', v === 'Ohne Angabe' ? null : v]);
      if (conds.length === 1) parts.push(conds[0]);
      else if (conds.length > 1) parts.push(conds.reduce<unknown[]>((acc, c) => (acc.length === 0 ? [c] : [...acc, 'or', c]), []));
    } else {
      const value = scalar(raw);
      if (value === null) continue;
      parts.push([l.key, l.kind === 'to' ? '<=' : '>=', value]);
    }
  }
  return andFilters(...parts);
}

// ----- Lesbarer Text -----

const OP_TEXT: Record<string, string> = {
  '=': 'ist',
  '<>': 'ist nicht',
  '<': 'kleiner als',
  '>': 'größer als',
  '<=': 'höchstens',
  '>=': 'mindestens',
  contains: 'enthält',
  notcontains: 'enthält nicht',
  startswith: 'beginnt mit',
  endswith: 'endet mit',
  between: 'zwischen',
  anyof: 'ist einer von',
  noneof: 'ist keiner von',
  isblank: 'ist leer',
  isnotblank: 'ist nicht leer',
};

function valueText(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'leer';
  if (value instanceof Date) return formatDateValue(value);
  if (typeof value === 'number') return String(value).replace('.', ',');
  return String(value);
}

/** Lesbarer deutscher Text des Ausdrucks mit Klammerung verschachtelter Gruppen. */
export function filterText<T>(expr: FilterExpr | null, fields: readonly ListField<T>[]): string {
  if (!expr || expr.length === 0) return '';
  const titles = new Map(fields.map((f) => [f.key, f.title]));
  const render = (e: unknown, nested: boolean): string => {
    if (isCondition(e)) {
      const [field, op, value] = e;
      const title = titles.get(field) ?? field;
      if (BLANK_OPS.includes(op)) return `${title} ${OP_TEXT[op]}`;
      if (op === 'between' && Array.isArray(value)) return `${title} zwischen ${valueText(value[0])} und ${valueText(value[1])}`;
      if (Array.isArray(value)) return `${title} ${OP_TEXT[op]} ${value.map(valueText).join(', ')}`;
      return `${title} ${OP_TEXT[op]} ${valueText(value)}`;
    }
    if (isNegation(e)) return `nicht (${render(e[1], false)})`;
    const group = groupParts(e);
    if (!group) return '';
    const text = group.items.map((i) => render(i, true)).filter((t) => t !== '').join(group.op === 'and' ? ' und ' : ' oder ');
    return nested && group.items.length > 1 ? `(${text})` : text;
  };
  return render(expr, false);
}
