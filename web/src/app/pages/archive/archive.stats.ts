import { FilterExpr } from '../../core/filter-expr';
import { dateRange } from '../../core/date-range';
import { kindLabel, wineTypeLabel } from '../../core/labels';
import { ArchiveEntry } from '../../core/models';
import { StatRow, StatTile, averageOf, compareRows, percent, sumOf, tile } from '../../core/stats';
import { ratingText } from '../../shared/star-rating.logic';

export const NO_RATING = 'Ohne Bewertung';

export interface ArchiveStats {
  tiles: StatTile[];
  byYear: StatRow[];
  byKind: StatRow[];
  byType: StatRow[];
  byRating: StatRow[];
}

type Key = string | number | null;

function split(
  entries: readonly ArchiveEntry[],
  total: number,
  keyOf: (e: ArchiveEntry) => Key,
  labelOf: (key: Key) => string,
  filterOf: (key: Key) => FilterExpr | null,
  sort: (a: StatRow, b: StatRow) => number,
): StatRow[] {
  const groups = new Map<Key, number>();
  for (const e of entries) groups.set(keyOf(e), (groups.get(keyOf(e)) ?? 0) + e.quantity);
  return [...groups]
    .map(([key, bottles]) => ({ label: labelOf(key), bottles, share: percent(bottles, total), value: null, filter: filterOf(key) }))
    .sort(sort);
}

export function archiveStats(entries: readonly ArchiveEntry[]): ArchiveStats {
  const total = sumOf(entries, (e) => e.quantity);
  const eq = (field: string) => (key: Key) => [[field, '=', key]] as FilterExpr;
  const empty = entries.length === 0;
  const text = (key: Key): string => String(key);
  const byBottles = (a: StatRow, b: StatRow): number => compareRows(a, b);

  return {
    tiles: [
      tile('bottles', 'Flaschen', 'integer', empty ? null : total),
      tile('entries', 'Einträge', 'integer', empty ? null : entries.length),
      tile('rating', 'Ø Bewertung', 'decimal1', averageOf(entries, (e) => e.rating)),
      tile('price', 'Summe Preis', 'currency', empty ? null : sumOf(entries, (e) => e.price)),
    ],
    byYear: split(
      entries,
      total,
      (e) => Number(e.date.slice(0, 4)),
      text,
      (key) => {
        const range = dateRange({ year: Number(key) });
        return range ? [['date', '>=', range[0]], 'and', ['date', '<=', range[1]]] : null;
      },
      (a, b) => Number(b.label) - Number(a.label),
    ),
    byKind: split(entries, total, (e) => kindLabel(e.kind), text, eq('kind'), byBottles),
    byType: split(entries, total, (e) => wineTypeLabel(e.wineType), text, eq('type'), byBottles),
    byRating: split(
      entries,
      total,
      (e) => e.rating,
      (key) => (key === null ? NO_RATING : ratingText(Number(key))),
      eq('rating'),
      (a, b) => compareRows(a, b, [NO_RATING]),
    ),
  };
}
