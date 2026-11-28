/**
 * Gemeinsame Bausteine der Statistik-Ansicht (Keller und Archiv): Kennzahlkacheln, Aufteilungszeilen mit Anteil,
 * Sortierung und einfache Summen. Reine Logik ohne Angular, damit sie ohne Oberfläche testbar ist.
 */
import { FilterExpr } from './filter-expr';
import { NO_VALUE, NumberFormat, formatNumber } from './list-model';

export interface StatTile {
  key: string;
  title: string;
  text: string;
  /** Erläuterung unter dem Wert, z. B. „1 Wein ohne Einkaufspreis nicht eingerechnet“. */
  hint?: string;
}

/** Eine Zeile einer Aufteilung; `filter` ist die Bedingung, mit der die Tabelle beim Antippen geöffnet wird. */
export interface StatRow {
  label: string;
  bottles: number;
  /** Anteil an allen Flaschen in ganzen Prozent. */
  share: number;
  /** Summe aus Flaschen × Preis; `null`, wenn kein Wein der Zeile einen Preis hat. */
  value: number | null;
  filter: FilterExpr | null;
  children?: StatRow[];
}

export function tile(key: string, title: string, format: NumberFormat, value: number | null, hint?: string): StatTile {
  return { key, title, text: value === null ? '–' : formatNumber(format, value), hint };
}

/** Summe über die Zeilen (leere Werte zählen nicht). */
export function sumOf<T>(rows: readonly T[], value: (row: T) => number | null): number {
  let total = 0;
  for (const row of rows) total += value(row) ?? 0;
  return total;
}

/** Durchschnitt über die Zeilen mit Wert; `null`, wenn keine einen hat. */
export function averageOf<T>(rows: readonly T[], value: (row: T) => number | null): number | null {
  const values = rows.map(value).filter((v): v is number => v !== null);
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** Flaschen absteigend, bei Gleichstand alphabetisch; die Bezeichnungen in `last` (Standard „Ohne Angabe“) zuletzt. */
export function compareRows(
  a: { label: string; bottles: number },
  b: { label: string; bottles: number },
  last: readonly string[] = [NO_VALUE],
): number {
  const la = last.includes(a.label) ? 1 : 0;
  const lb = last.includes(b.label) ? 1 : 0;
  if (la !== lb) return la - lb;
  return b.bottles - a.bottles || a.label.localeCompare(b.label, 'de');
}

export interface Accumulator {
  bottles: number;
  value: number | null;
}

export function add(acc: Accumulator, bottles: number, value: number | null): void {
  acc.bottles += bottles;
  if (value !== null) acc.value = (acc.value ?? 0) + value;
}
