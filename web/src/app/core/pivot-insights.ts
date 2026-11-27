import { NumberFormat, formatNumber } from './list-model';
import { PivotLayout } from './list-view-state';
import { PivotItem } from './pivot-matrix';

/** Gesamtwert einer Kennzahlkachel über die (gefilterten) Zeilen der Liste. */
export interface ListKpi<T> {
  key: string;
  title: string;
  format: NumberFormat;
  value: (rows: readonly T[]) => number | null;
}

export interface KpiTile {
  key: string;
  title: string;
  text: string;
}

export function computeKpis<T>(rows: readonly T[], kpis: readonly ListKpi<T>[]): KpiTile[] {
  return kpis.map((k) => {
    const value = k.value(rows);
    return { key: k.key, title: k.title, text: value === null ? '–' : formatNumber(k.format, value) };
  });
}

/** Summe einer Zahl über die Zeilen (leere Werte zählen nicht); `null`, wenn es keine Zeilen gibt. */
export function sumOf<T>(rows: readonly T[], value: (row: T) => number | null): number | null {
  if (rows.length === 0) return null;
  let total = 0;
  for (const row of rows) total += value(row) ?? 0;
  return total;
}

/** Durchschnitt über die Zeilen mit Wert; `null`, wenn keine einen hat. */
export function averageOf<T>(rows: readonly T[], value: (row: T) => number | null): number | null {
  const values = rows.map(value).filter((v): v is number => v !== null);
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

/** Vorbereitete Anordnung des Pivots; die erste Vorlage einer Liste ist deren Vorgabe. */
export interface PivotPreset {
  id: string;
  title: string;
  layout: PivotLayout;
}

/** Vergleichbare Beschreibung einer Anordnung (Felder je Bereich in Reihenfolge, Kennzahlen). */
export function layoutSignature(layout: Pick<PivotLayout, 'rows' | 'cols' | 'data'>): string {
  return JSON.stringify([layout.rows, layout.cols, layout.data]);
}

interface DxFieldInfo {
  area?: string;
  areaIndex?: number;
  dataField?: string;
  groupName?: string;
}

/** Anordnung aus den Feldern der Pivot-Datenquelle; Kennzahlfelder tragen das Präfix `measurePrefix`. */
export function signatureOfFields(fields: readonly DxFieldInfo[], measurePrefix: string): string {
  const pick = (area: string): string[] =>
    fields
      .filter((f) => f.area === area)
      .sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0))
      .map((f) => {
        const key = f.groupName ?? f.dataField ?? '';
        return area === 'data' && key.startsWith(measurePrefix) ? key.slice(measurePrefix.length) : key;
      });
  return layoutSignature({ rows: pick('row'), cols: pick('column'), data: pick('data') });
}

/** Die `n` Werte des Feldes `key` mit der größten Summe der Kennzahl `measureKey`, absteigend. */
export function topValues(records: readonly Record<string, unknown>[], key: string, measureKey: string, n: number): unknown[] {
  const sums = new Map<unknown, number>();
  for (const r of records) {
    const v = r[key];
    if (v === null || v === undefined || v === '') continue;
    const m = r[measureKey];
    sums.set(v, (sums.get(v) ?? 0) + (typeof m === 'number' ? m : 0));
  }
  return [...sums.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([v]) => v);
}

/** Farbstufe 0 (keine) bis 4 einer Zelle relativ zu Minimum und Maximum ihrer Kennzahl. */
export function heatLevel(value: number | null | undefined, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !(max > min)) return 0;
  // Wurzelskala: wenige große Werte sollen kleine nicht alle in die unterste Stufe drücken.
  const ratio = Math.sqrt((value - min) / (max - min));
  return Math.min(4, 1 + Math.floor(ratio * 4));
}

/** Wertepfad der Zeile, deren Beschriftungen (mit „ - “ verbunden) dem Text einer Diagramm-Beschriftung entsprechen. */
export function pathByLabel(items: readonly PivotItem[], label: string, separator = ' - '): unknown[] | null {
  const walk = (list: readonly PivotItem[], labels: string[], values: unknown[]): unknown[] | null => {
    for (const item of list) {
      const l = [...labels, item.text ?? String(item.value ?? '')];
      const v = [...values, item.value];
      if (l.join(separator) === label) return v;
      if (item.children?.length) {
        const found = walk(item.children, l, v);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(items, [], []);
}
