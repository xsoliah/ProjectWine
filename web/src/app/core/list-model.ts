/**
 * Gemeinsames Modell der Listen Keller, Archiv und Regale: Felder (Tabellenspalten, Filterfelder)
 * daraus abgeleitete flache Datensätze für DevExtreme (Tabelle, Filter) sowie CSV-Erzeugung.
 * Keine Angular-Abhängigkeiten, damit alles ohne Oberfläche testbar ist.
 */

export const NO_VALUE = 'Ohne Angabe';

export type ListView = 'tiles' | 'table' | 'stats';
export const LIST_VIEWS: readonly ListView[] = ['tiles', 'table', 'stats'];

/**
 * Gemerkte oder in der Adresse stehende Ansicht, die in der Liste zulässig ist; die frühere Ansicht „pivot“ wird zu
 * „stats“ (oder zu „tiles“, wenn die Liste keine Statistik hat). Unbekanntes ergibt `null`.
 */
export function parseView(raw: string | null | undefined, allowed: readonly ListView[] = LIST_VIEWS): ListView | null {
  const view = raw === 'pivot' ? 'stats' : raw;
  if (!view || !(LIST_VIEWS as readonly string[]).includes(view)) return null;
  return allowed.includes(view as ListView) ? (view as ListView) : raw === 'pivot' ? 'tiles' : null;
}

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
   * Mehrwertiges Feld (z. B. Rebsorten): Tabelle und Filter sehen die Werte „, “-getrennt als Text.
   */
  values?: (row: T) => string[];
  /** Anzeigetext in Tabelle und CSV, falls vom Wert abweichend. */
  display?: (row: T) => string;
  /** Tabellenspalte: `default` = standardmäßig sichtbar, `optional` = wählbar; fehlt = keine Spalte. */
  column?: 'default' | 'optional';
  /** Anzeigetext eines Zahlenwerts in Tabelle und CSV, falls vom Wert abweichend (z. B. „Top“ für 6). */
  valueText?: (value: number) => string;
  /** Wählbare Zahlenwerte im Filter-Editor (mit `valueText` beschriftet), z. B. die Bewertungsstufen. */
  levels?: readonly number[];
  /** Zahlenformat der Spalte. */
  format?: NumberFormat;
  /** Feste Reihenfolge der Werte (übrige danach, „Ohne Angabe“ zuletzt). */
  order?: readonly string[];
  /** Aus dem Filter-Editor und den Spaltenfiltern ausnehmen. */
  noFilter?: boolean;
}


/** Datensatz für DevExtreme: Feldwerte unter ihrem Schlüssel, die Zeile unter `__row`. */
export type Rec<T> = Record<string, unknown> & { __row: T };


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

/** Flache Datensätze der Zeilen für DevExtreme; mehrwertige Felder stehen als „, “-getrennter Text. */
export function toRecords<T>(rows: readonly T[], fields: readonly ListField<T>[]): Rec<T>[] {
  return rows.map((row) => {
    const record: Record<string, unknown> = { __row: row };
    for (const field of fields) {
      record[field.key] = field.values ? joinValues(field.values(row)) : blank(field.value(row));
    }
    return record as Rec<T>;
  });
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
