import { FilterExpr, andFilters } from '../../core/filter-expr';
import { NO_VALUE } from '../../core/list-model';
import { wineTypeLabel } from '../../core/labels';
import { Wine } from '../../core/models';
import { Accumulator, StatRow, StatTile, add, compareRows, percent, sumOf, tile } from '../../core/stats';
import { PLACEMENT_PARTLY, PLACEMENT_UNPLACED, windowState } from './cellar.views';

export const NO_REGION = 'Ohne Region';
export const UNPLACED_LABEL = 'Ohne Fach';
/** So viele Regionen zeigt eine Regalkarte; der Rest steht unter „+ n weitere“. */
export const CARD_LIMIT = 5;

export interface CountLine {
  label: string;
  bottles: number;
}

export interface RackCard {
  key: string;
  name: string;
  bottles: number;
  value: number | null;
  types: CountLine[];
  regions: CountLine[];
  regionsMore: number;
  filter: FilterExpr | null;
}

export interface CellarStats {
  tiles: StatTile[];
  racks: RackCard[];
  byType: StatRow[];
  byCountry: StatRow[];
  byWindow: StatRow[];
}

interface RackAcc extends Accumulator {
  name: string;
  types: Map<string, number>;
  regions: Map<string, number>;
}

function lines(map: Map<string, number>, last: readonly string[]): CountLine[] {
  return [...map].map(([label, bottles]) => ({ label, bottles })).sort((a, b) => compareRows(a, b, last));
}

function bump(map: Map<string, number>, key: string, n: number): void {
  map.set(key, (map.get(key) ?? 0) + n);
}

const newRack = (name: string): RackAcc => ({ bottles: 0, value: null, name, types: new Map(), regions: new Map() });

function rackCards(wines: readonly Wine[]): RackCard[] {
  const racks = new Map<string, RackAcc>();
  const unplaced = newRack(UNPLACED_LABEL);
  const put = (acc: RackAcc, wine: Wine, bottles: number): void => {
    if (bottles <= 0) return;
    add(acc, bottles, wine.purchasePrice === null ? null : wine.purchasePrice * bottles);
    bump(acc.types, wineTypeLabel(wine.type), bottles);
    bump(acc.regions, wine.region?.name ?? NO_REGION, bottles);
  };
  for (const wine of wines) {
    const perRack = new Map<string, number>();
    for (const slot of wine.slots) {
      perRack.set(slot.rackId, (perRack.get(slot.rackId) ?? 0) + 1);
      if (!racks.has(slot.rackId)) racks.set(slot.rackId, newRack(slot.rackName));
    }
    for (const [id, n] of perRack) put(racks.get(id)!, wine, n);
    put(unplaced, wine, wine.unplacedCount);
  }
  const toCard = (key: string, acc: RackAcc, filter: FilterExpr | null): RackCard => {
    const regions = lines(acc.regions, [NO_REGION]);
    return {
      key,
      name: acc.name,
      bottles: acc.bottles,
      value: acc.value,
      types: lines(acc.types, []),
      regions: regions.slice(0, CARD_LIMIT),
      regionsMore: Math.max(0, regions.length - CARD_LIMIT),
      filter,
    };
  };
  const cards = [...racks].map(([id, acc]) => toCard(id, acc, [['rack', 'contains', acc.name]]));
  cards.sort((a, b) => b.bottles - a.bottles || a.name.localeCompare(b.name, 'de'));
  if (unplaced.bottles > 0) {
    cards.push(toCard('unplaced', unplaced, [['placement', '=', PLACEMENT_UNPLACED], 'or', ['placement', '=', PLACEMENT_PARTLY]]));
  }
  return cards;
}

/** Aufteilung der Flaschen nach einem Wert je Wein; `filterOf` liefert die Bedingung der Zeile. */
function split(
  wines: readonly Wine[],
  total: number,
  labelOf: (wine: Wine) => string | null,
  filterOf: (label: string | null) => FilterExpr | null,
): StatRow[] {
  const groups = new Map<string | null, Accumulator>();
  for (const wine of wines) {
    const key = labelOf(wine);
    const acc = groups.get(key) ?? { bottles: 0, value: null };
    add(acc, wine.quantity, wine.purchasePrice === null ? null : wine.purchasePrice * wine.quantity);
    groups.set(key, acc);
  }
  return [...groups]
    .map(([key, acc]) => ({
      label: key ?? NO_VALUE,
      bottles: acc.bottles,
      share: percent(acc.bottles, total),
      value: acc.value,
      filter: filterOf(key),
    }))
    .sort((a, b) => compareRows(a, b));
}

export function cellarStats(wines: readonly Wine[], year: number): CellarStats {
  const bottles = sumOf(wines, (w) => w.quantity);
  const value = sumOf(wines, (w) => (w.purchasePrice === null ? null : w.purchasePrice * w.quantity));
  const unpriced = wines.filter((w) => w.purchasePrice === null).length;
  const eq = (key: string) => (label: string | null) => [[key, '=', label]] as FilterExpr;
  const empty = wines.length === 0;

  const byCountry = split(wines, bottles, (w) => w.country?.name ?? null, eq('country')).map((row) => {
    const inCountry = wines.filter((w) => (w.country?.name ?? NO_VALUE) === row.label);
    const regions = split(inCountry, bottles, (w) => w.region?.name ?? null, eq('region'));
    return { ...row, children: regions.map((r) => ({ ...r, filter: andFilters(row.filter, r.filter) })) };
  });

  return {
    tiles: [
      tile('bottles', 'Flaschen', 'integer', empty ? null : bottles),
      tile('wines', 'Weine', 'integer', empty ? null : wines.length),
      tile(
        'value',
        'Geschätzter Wert',
        'currency',
        empty ? null : value,
        unpriced > 0 ? `${unpriced} ${unpriced === 1 ? 'Wein' : 'Weine'} ohne Einkaufspreis nicht eingerechnet` : undefined,
      ),
    ],
    racks: rackCards(wines),
    byType: split(wines, bottles, (w) => wineTypeLabel(w.type), eq('type')),
    byCountry,
    byWindow: split(wines, bottles, (w) => windowState(w, year), eq('window')),
  };
}
