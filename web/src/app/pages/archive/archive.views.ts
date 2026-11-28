import { LegacyParam } from '../../core/filter-expr';
import { formatDate } from '../../core/format';
import { CONSUMPTION_KINDS, WINE_TYPES, kindLabel, wineTypeLabel } from '../../core/labels';
import { ListField, parseIsoDate } from '../../core/list-model';
import { ArchiveEntry } from '../../core/models';
import { RATING_LEVELS, ratingText } from '../../shared/star-rating.logic';

/** Felder des Archivs; die erste (Wein) ist immer sichtbar. */
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
    },
    { key: 'producer', title: 'Winzer', type: 'string', value: (e) => e.producer, column: 'optional' },
    { key: 'vintage', title: 'Jahrgang', type: 'number', value: (e) => e.vintage, column: 'optional' },
    {
      key: 'type',
      title: 'Weinart',
      type: 'string',
      value: (e) => wineTypeLabel(e.wineType),
      order: WINE_TYPES.map((t) => t.label),
      column: 'default',
    },
    {
      key: 'kind',
      title: 'Abgangsart',
      type: 'string',
      value: (e) => kindLabel(e.kind),
      order: CONSUMPTION_KINDS.map((k) => k.label),
      column: 'default',
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
