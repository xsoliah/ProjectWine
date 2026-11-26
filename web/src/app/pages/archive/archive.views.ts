import { formatDate, formatPrice } from '../../core/format';
import { CONSUMPTION_KINDS, WINE_TYPES, kindLabel, wineTypeLabel } from '../../core/labels';
import { Column, Dimension, FilterDef, Measure, PivotConfig } from '../../core/list-views';
import { ArchiveEntry } from '../../core/models';

const text = (value: string | null | undefined): string[] => (value ? [value] : []);
const year = (e: ArchiveEntry): string => e.date.slice(0, 4);
const month = (e: ArchiveEntry): string => e.date.slice(0, 7);

export const ARCHIVE_PIVOT: PivotConfig = { row: 'year', col: 'kind', measure: 'bottles' };

/** Spalten der Archivtabelle; die erste (Wein) ist immer sichtbar. */
export function archiveColumns(): Column<ArchiveEntry>[] {
  return [
    { key: 'wine', title: 'Wein', type: 'text', value: (e) => e.wineName, defaultVisible: true },
    { key: 'date', title: 'Datum', type: 'date', value: (e) => e.date, display: (e) => formatDate(e.date), defaultVisible: true },
    { key: 'producer', title: 'Winzer', type: 'text', value: (e) => e.producer, defaultVisible: false },
    { key: 'vintage', title: 'Jahrgang', type: 'number', value: (e) => e.vintage, defaultVisible: false },
    { key: 'type', title: 'Art', type: 'text', value: (e) => wineTypeLabel(e.wineType), defaultVisible: true },
    { key: 'kind', title: 'Abgangsart', type: 'text', value: (e) => kindLabel(e.kind), defaultVisible: true },
    { key: 'quantity', title: 'Anzahl', type: 'number', value: (e) => e.quantity, defaultVisible: true },
    { key: 'rating', title: 'Bewertung', type: 'number', value: (e) => e.rating, defaultVisible: true },
    { key: 'price', title: 'Preis', type: 'number', value: (e) => e.price, display: (e) => formatPrice(e.price), defaultVisible: true },
    { key: 'counterparty', title: 'Gegenpartei', type: 'text', value: (e) => e.counterparty, defaultVisible: false },
  ];
}

export function archiveFilters(): FilterDef<ArchiveEntry>[] {
  return [
    { kind: 'multi', key: 'kind', title: 'Abgangsart', values: (e) => [kindLabel(e.kind)], options: CONSUMPTION_KINDS.map((k) => k.label) },
    { kind: 'multi', key: 'type', title: 'Weinart', values: (e) => [wineTypeLabel(e.wineType)], options: WINE_TYPES.map((t) => t.label) },
    { kind: 'range', key: 'period', title: 'Zeitraum', input: 'date', value: (e) => e.date },
    { kind: 'min', key: 'rating', title: 'Bewertung', value: (e) => e.rating, steps: [1, 2, 3, 4, 5] },
  ];
}

export function archiveDimensions(): Dimension<ArchiveEntry>[] {
  return [
    { key: 'type', title: 'Weinart', values: (e) => [wineTypeLabel(e.wineType)], order: WINE_TYPES.map((t) => t.label) },
    { key: 'kind', title: 'Abgangsart', values: (e) => [kindLabel(e.kind)], order: CONSUMPTION_KINDS.map((k) => k.label) },
    { key: 'producer', title: 'Winzer', values: (e) => text(e.producer) },
    { key: 'vintage', title: 'Jahrgang', values: (e) => (e.vintage === null ? [] : [String(e.vintage)]) },
    { key: 'year', title: 'Jahr', values: (e) => [year(e)] },
    { key: 'month', title: 'Monat', values: (e) => [month(e)] },
    { key: 'rating', title: 'Bewertung', values: (e) => (e.rating === null ? [] : [String(e.rating)]) },
  ];
}

const integer = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function archiveMeasures(): Measure<ArchiveEntry>[] {
  return [
    { key: 'bottles', title: 'Anzahl Flaschen', kind: 'sum', value: (e) => e.quantity, format: (v) => integer.format(v) },
    { key: 'entries', title: 'Anzahl Einträge', kind: 'sum', value: () => 1, format: (v) => integer.format(v) },
    { key: 'price', title: 'Summe Preis', kind: 'sum', value: (e) => e.price, format: (v) => formatPrice(v) },
    { key: 'rating', title: 'Durchschnittsbewertung', kind: 'avg', value: (e) => e.rating, format: (v) => oneDecimal.format(v) },
  ];
}
