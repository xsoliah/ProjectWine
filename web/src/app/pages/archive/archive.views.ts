import { LegacyParam } from '../../core/filter-expr';
import { formatDate } from '../../core/format';
import { CONSUMPTION_KINDS, WINE_TYPES, kindLabel, wineTypeLabel } from '../../core/labels';
import { ListField, ListMeasure, parseIsoDate } from '../../core/list-model';
import { PivotLayout } from '../../core/list-view-state';
import { ListKpi, PivotPreset, averageOf, sumOf } from '../../core/pivot-insights';
import { ArchiveEntry } from '../../core/models';
import { RATING_LEVELS, ratingText } from '../../shared/star-rating.logic';

/** Felder des Archivs; die erste (Wein) ist immer sichtbar. Das Datum ist im Pivot nach Jahr, Quartal und Monat gruppiert. */
export function archiveFields(): ListField<ArchiveEntry>[] {
  return [
    { key: 'wine', title: 'Wein', type: 'string', value: (e) => e.wineName, column: 'default' },
    {
      key: 'date',
      title: 'Datum',
      type: 'date',
      value: (e) => parseIsoDate(e.date),
      display: (e) => formatDate(e.date),
      column: 'default',
      pivot: true,
    },
    { key: 'producer', title: 'Winzer', type: 'string', value: (e) => e.producer, column: 'optional', pivot: true },
    { key: 'vintage', title: 'Jahrgang', type: 'number', value: (e) => e.vintage, column: 'optional', pivot: true },
    {
      key: 'type',
      title: 'Weinart',
      type: 'string',
      value: (e) => wineTypeLabel(e.wineType),
      order: WINE_TYPES.map((t) => t.label),
      column: 'default',
      pivot: true,
    },
    {
      key: 'kind',
      title: 'Abgangsart',
      type: 'string',
      value: (e) => kindLabel(e.kind),
      order: CONSUMPTION_KINDS.map((k) => k.label),
      column: 'default',
      pivot: true,
    },
    { key: 'quantity', title: 'Anzahl', type: 'number', value: (e) => e.quantity, column: 'default' },
    {
      key: 'rating',
      title: 'Bewertung',
      type: 'number',
      value: (e) => e.rating,
      valueText: ratingText,
      levels: RATING_LEVELS,
      column: 'default',
      pivot: true,
    },
    { key: 'price', title: 'Preis', type: 'number', value: (e) => e.price, format: 'currency', column: 'default' },
    { key: 'counterparty', title: 'Gegenpartei', type: 'string', value: (e) => e.counterparty, column: 'optional' },
  ];
}

export const ARCHIVE_LEGACY: LegacyParam[] = [
  { param: 'kind', key: 'kind', kind: 'multi' },
  { param: 'type', key: 'type', kind: 'multi' },
  { param: 'periodFrom', key: 'date', kind: 'from' },
  { param: 'periodTo', key: 'date', kind: 'to' },
  { param: 'ratingMin', key: 'rating', kind: 'min' },
];

export function archiveMeasures(): ListMeasure<ArchiveEntry>[] {
  return [
    { key: 'bottles', title: 'Anzahl Flaschen', kind: 'sum', value: (e) => e.quantity, format: 'integer' },
    { key: 'entries', title: 'Anzahl Einträge', kind: 'sum', value: () => 1, format: 'integer' },
    { key: 'price', title: 'Summe Preis', kind: 'sum', value: (e) => e.price, format: 'currency' },
    { key: 'rating', title: 'Durchschnittsbewertung', kind: 'avg', value: (e) => e.rating, format: 'decimal1' },
  ];
}

/** Vorlagen des Archiv-Pivots; die erste ist die Vorgabe (Jahre zugeklappt, darunter Quartal und Monat). */
export const ARCHIVE_PRESETS: PivotPreset[] = [
  { id: 'year', title: 'Jahr × Abgangsart', layout: { rows: ['date'], cols: ['kind'], data: ['bottles', 'rating'] } },
  { id: 'type', title: 'Weinart × Abgangsart', layout: { rows: ['type'], cols: ['kind'], data: ['bottles'] } },
  { id: 'rating', title: 'Bewertung × Weinart', layout: { rows: ['rating'], cols: ['type'], data: ['entries'] } },
];

export const ARCHIVE_PIVOT: PivotLayout = ARCHIVE_PRESETS[0].layout;

export function archiveKpis(): ListKpi<ArchiveEntry>[] {
  return [
    { key: 'bottles', title: 'Flaschen', format: 'integer', value: (rows) => sumOf(rows, (e) => e.quantity) },
    { key: 'entries', title: 'Einträge', format: 'integer', value: (rows) => rows.length },
    { key: 'rating', title: 'Ø Bewertung', format: 'decimal1', value: (rows) => averageOf(rows, (e) => e.rating) },
  ];
}
