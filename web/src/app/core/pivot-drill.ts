/**
 * Aufschlüsseln einer Pivotzelle: der Pfad aus Zeilen- und Spaltenfeldern wird in Filterbedingungen übersetzt
 * (mit „und“ verknüpft). Reine Logik ohne DevExtreme-Abhängigkeit.
 */
import { FilterExpr, andFilters } from './filter-expr';
import { ListField, NO_VALUE } from './list-model';

export type DateInterval = 'year' | 'quarter' | 'month';

/** Ein Schritt des Pfades: Feld, bei Datumsfeldern die Gruppenebene, und der Wert der Zelle auf dieser Ebene. */
export interface PathItem {
  key: string;
  interval?: DateInterval;
  value: unknown;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '' || value === NO_VALUE;
}

/** Zeitraum (einschließlich Ende) aus den gesetzten Gruppenebenen; ohne Jahr nicht abbildbar. */
export function dateRange(parts: Partial<Record<DateInterval, number>>): [Date, Date] | null {
  const year = parts.year;
  if (year === undefined) return null;
  if (parts.month !== undefined) return [new Date(year, parts.month - 1, 1), new Date(year, parts.month, 0)];
  if (parts.quarter !== undefined) return [new Date(year, (parts.quarter - 1) * 3, 1), new Date(year, parts.quarter * 3, 0)];
  return [new Date(year, 0, 1), new Date(year, 11, 31)];
}

/** Filterausdruck für den Pfad einer Zelle; leerer Pfad ergibt `null` (alle Einträge). */
export function drillFilter<T>(path: readonly PathItem[], fields: readonly ListField<T>[]): FilterExpr | null {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const conditions: FilterExpr[] = [];
  const dates = new Map<string, Partial<Record<DateInterval, number>>>();
  for (const item of path) {
    const field = byKey.get(item.key);
    if (!field) continue;
    if (field.type === 'date' && item.interval) {
      const parts = dates.get(item.key) ?? {};
      if (!isBlank(item.value)) parts[item.interval] = Number(item.value);
      dates.set(item.key, parts);
      continue;
    }
    const target = field.drill === undefined ? { key: field.key, op: '=' } : field.drill;
    if (!target) continue;
    conditions.push(isBlank(item.value) ? [target.key, '=', null] : [target.key, target.op, item.value]);
  }
  for (const [key, parts] of dates) {
    const range = dateRange(parts);
    if (range) conditions.push([[key, '>=', range[0]], 'and', [key, '<=', range[1]]]);
  }
  return andFilters(...conditions);
}
