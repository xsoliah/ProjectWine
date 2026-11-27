import { LegacyParam } from '../../core/filter-expr';
import { formatDate } from '../../core/format';
import { CONSUMPTION_KINDS, WINE_TYPES, kindLabel, wineTypeLabel } from '../../core/labels';
import { ListField, ListMeasure, parseIsoDate } from '../../core/list-model';
import { PivotLayout } from '../../core/list-view-state';
import { ArchiveEntry } from '../../core/models';

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
    { key: 'rating', title: 'Bewertung', type: 'number', value: (e) => e.rating, column: 'default', pivot: true },
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

/** Vorgabe: Datum (Jahr → Quartal → Monat, zunächst nur Jahre) × Abgangsart mit Flaschen. */
export const ARCHIVE_PIVOT: PivotLayout = { rows: ['date'], cols: ['kind'], data: ['bottles'] };
