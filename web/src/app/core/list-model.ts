/**
 * Gemeinsames Modell der Listen Keller, Archiv und Regale: Felder (Tabellenspalten, Filterfelder, Pivot-Dimensionen)
 * und Kennzahlen je Liste, daraus abgeleitete flache Datensätze für DevExtreme sowie CSV-Erzeugung.
 * Keine Angular-Abhängigkeiten, damit alles ohne Oberfläche testbar ist.
 */

export const NO_VALUE = 'Ohne Angabe';

export type ListView = 'tiles' | 'table' | 'pivot';
export const LIST_VIEWS: readonly ListView[] = ['tiles', 'table', 'pivot'];

export type FieldType = 'string' | 'number' | 'date';
export type Scalar = string | number | Date | null;
export type NumberFormat = 'integer' | 'currency' | 'decimal1';

export interface ListField<T> {
  key: string;
  title: string;
  type: FieldType;
  /** Wert der Zeile; Datum als `Date` (lokale Mitternacht), leer als `null`. */
  value: (row: T) => Scalar;
  /**
   * Mehrwertiges Feld (z. B. Rebsorten): Tabelle und Filter sehen die Werte „, “-getrennt als Text; im Pivot wird die
   * Zeile je Wert aufgefächert.
   */
  values?: (row: T) => string[];
  /** Anzeigetext in Tabelle und CSV, falls vom Wert abweichend. */
  display?: (row: T) => string;
  /** Tabellenspalte: `default` = standardmäßig sichtbar, `optional` = wählbar; fehlt = keine Spalte. */
  column?: 'default' | 'optional';
  /** Anzeigetext eines Zahlenwerts in Tabelle, CSV und Pivot, falls vom Wert abweichend (z. B. „Top“ für 6). */
  valueText?: (value: number) => string;
  /** Wählbare Zahlenwerte im Filter-Editor (mit `valueText` beschriftet), z. B. die Bewertungsstufen. */
  levels?: readonly number[];
  /** Zahlenformat der Spalte. */
  format?: NumberFormat;
  /** Feste Reihenfolge der Werte (übrige danach, „Ohne Angabe“ zuletzt). */
  order?: readonly string[];
  /** Im Pivot als Feld (Dimension) wählbar. */
  pivot?: boolean;
  /** Im Pivot: Tabellenfeld und Operator, auf die ein Klick auf diese Ebene aufgeschlüsselt wird (Standard: dasselbe Feld, „=“). */
  drill?: { key: string; op: string } | null;
  /** Aus dem Filter-Editor und den Spaltenfiltern ausnehmen. */
  noFilter?: boolean;
}

export interface ListMeasure<T> {
  key: string;
  title: string;
  kind: 'sum' | 'avg';
  value: (row: T) => number | null;
  format: NumberFormat;
}

/** Datensatz für DevExtreme: Feldwerte unter ihrem Schlüssel, Kennzahlen unter `m_<Schlüssel>`, die Zeile unter `__row`. */
export type Rec<T> = Record<string, unknown> & { __row: T };

export const MEASURE_PREFIX = 'm_';

export function isMulti<T>(field: ListField<T>): boolean {
  return field.values !== undefined;
}

/** Textwert eines mehrwertigen Feldes für Tabelle und Filter. */
export function joinValues(values: readonly string[]): string | null {
  const unique = [...new Set(values.filter((v) => v !== ''))];
  return unique.length > 0 ? unique.join(', ') : null;
}

function blank(value: Scalar | undefined): Scalar {
  return value === undefined || value === '' ? null : value;
}

/**
 * Flache Datensätze der Zeilen. Mehrwertige Felder stehen als Text; die Schlüssel in `fan` werden aufgefächert
 * (eine Zeile je Wert, bei mehreren Schlüsseln als Kreuzprodukt; ohne Wert bleibt eine Zeile mit `null`).
 */
export function toRecords<T>(
  rows: readonly T[],
  fields: readonly ListField<T>[],
  measures: readonly ListMeasure<T>[] = [],
  fan: ReadonlySet<string> = new Set(),
): Rec<T>[] {
  const out: Rec<T>[] = [];
  for (const row of rows) {
    const base: Record<string, unknown> = { __row: row };
    const fanned: { key: string; values: (string | null)[] }[] = [];
    for (const field of fields) {
      if (field.values) {
        const values = [...new Set(field.values(row).filter((v) => v !== ''))];
        if (fan.has(field.key)) fanned.push({ key: field.key, values: values.length > 0 ? values : [null] });
        else base[field.key] = joinValues(values);
      } else {
        base[field.key] = blank(field.value(row));
      }
    }
    for (const m of measures) base[MEASURE_PREFIX + m.key] = m.value(row);
    let combos: Record<string, unknown>[] = [base];
    for (const { key, values } of fanned) {
      combos = combos.flatMap((c) => values.map((v) => ({ ...c, [key]: v })));
    }
    out.push(...(combos as Rec<T>[]));
  }
  return out;
}

/** Ob ein Feld in mindestens einer Zeile mehrere Werte hat (Summen können dann Flaschen mehrfach zählen). */
export function hasMultiplicity<T>(rows: readonly T[], field: ListField<T>): boolean {
  if (!field.values) return false;
  return rows.some((r) => new Set(field.values!(r).filter((v) => v !== '')).size > 1);
}

// ----- Anzeige -----

export const integerFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
export const decimal1Format = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const currencyFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatNumber(format: NumberFormat, value: number): string {
  switch (format) {
    case 'currency':
      return currencyFormat.format(value);
    case 'decimal1':
      return decimal1Format.format(value);
    default:
      return integerFormat.format(value);
  }
}

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatDateValue(value: Date): string {
  return dateFormat.format(value);
}

/** Angezeigter Text einer Zelle (Tabelle und CSV). */
export function cellText<T>(field: ListField<T>, row: T): string {
  if (field.display) return field.display(row);
  if (field.values) return joinValues(field.values(row)) ?? '';
  const value = field.value(row);
  if (value === null || value === '') return '';
  if (value instanceof Date) return formatDateValue(value);
  if (typeof value === 'number' && field.valueText) return field.valueText(value);
  if (typeof value === 'number' && field.format) return formatNumber(field.format, value);
  return String(value);
}

/** Lokales Datum aus `yyyy-MM-dd` (ohne Zeitzonenverschiebung); ungültig → `null`. */
export function parseIsoDate(iso: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ----- Spalten -----

/** Felder, die als Tabellenspalten dienen (erste ist immer sichtbar). */
export function columnFields<T>(fields: readonly ListField<T>[]): ListField<T>[] {
  return fields.filter((f) => f.column);
}

// ----- CSV -----

/** Entschärft Zellen, die eine Tabellenkalkulation als Formel ausführen würde. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'number' ? String(value).replace('.', ',') : value;
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** UTF-8 mit BOM, Semikolon als Trenner (deutsches Excel). */
export function toCsv(header: readonly string[], rows: readonly (readonly (string | number | null)[])[]): string {
  const lines = [header, ...rows].map((line) => line.map(csvCell).join(';'));
  return `﻿${lines.join('\r\n')}\r\n`;
}

export function tableCsv<T>(rows: readonly T[], fields: readonly ListField<T>[]): string {
  return toCsv(
    fields.map((f) => f.title),
    rows.map((row) => fields.map((f) => cellText(f, row))),
  );
}
