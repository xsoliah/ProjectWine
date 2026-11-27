import { drinkWindow } from '../../core/drink-window';
import { LegacyParam } from '../../core/filter-expr';
import { WINE_TYPES, wineTypeLabel } from '../../core/labels';
import { ListField, ListMeasure } from '../../core/list-model';
import { PivotLayout } from '../../core/list-view-state';
import { Wine } from '../../core/models';

/** Trinkfenster-Status eines Weins als Anzeigetext; `null` ohne Angabe. */
export function windowState(wine: Pick<Wine, 'drinkFrom' | 'drinkUntil'>, year: number): string | null {
  switch (drinkWindow(wine, year)?.state) {
    case 'ready':
      return 'Trinkreif';
    case 'early':
      return 'Noch warten';
    case 'late':
      return 'Überschritten';
    default:
      return null;
  }
}

export const WINDOW_STATES = ['Trinkreif', 'Noch warten', 'Überschritten'] as const;
export const PLACEMENT_IN_RACK = 'In Regal';
export const PLACEMENT_PARTLY = 'Teilweise im Regal';
export const PLACEMENT_UNPLACED = 'Ohne Fach';

const rackNames = (wine: Wine): string[] => [...new Set(wine.slots.map((s) => s.rackName))];

/** Ob alle, einige oder keine Flaschen des Weins ein Regalfach haben. */
export function placement(wine: Wine): string {
  if (wine.slots.length === 0) return PLACEMENT_UNPLACED;
  return wine.unplacedCount > 0 ? PLACEMENT_PARTLY : PLACEMENT_IN_RACK;
}

function windowText(wine: Wine): string {
  const { drinkFrom: from, drinkUntil: until } = wine;
  if (from !== null && until !== null) return `${from}–${until}`;
  if (from !== null) return `ab ${from}`;
  if (until !== null) return `bis ${until}`;
  return '';
}

/** Felder des Kellers: Tabellenspalten, Filterfelder und Pivot-Dimensionen. Die erste (Name) ist immer sichtbar. */
export function cellarFields(year: number): ListField<Wine>[] {
  return [
    { key: 'name', title: 'Name', type: 'string', value: (w) => w.name, column: 'default' },
    { key: 'producer', title: 'Winzer', type: 'string', value: (w) => w.producer, column: 'default', pivot: true },
    { key: 'vintage', title: 'Jahrgang', type: 'number', value: (w) => w.vintage, column: 'default', pivot: true },
    {
      key: 'type',
      title: 'Weinart',
      type: 'string',
      value: (w) => wineTypeLabel(w.type),
      order: WINE_TYPES.map((t) => t.label),
      column: 'default',
      pivot: true,
    },
    { key: 'country', title: 'Land', type: 'string', value: (w) => w.country?.name ?? null, column: 'default', pivot: true },
    { key: 'region', title: 'Region', type: 'string', value: (w) => w.region?.name ?? null, column: 'default', pivot: true },
    {
      key: 'grape',
      title: 'Rebsorte',
      type: 'string',
      value: () => null,
      values: (w) => w.grapes.map((g) => g.name),
      column: 'optional',
      pivot: true,
      drill: { key: 'grape', op: 'contains' },
    },
    { key: 'quantity', title: 'Flaschen', type: 'number', value: (w) => w.quantity, column: 'default' },
    {
      key: 'window',
      title: 'Trinkfenster',
      type: 'string',
      value: (w) => windowState(w, year),
      display: windowText,
      order: WINDOW_STATES,
      column: 'default',
      pivot: true,
    },
    { key: 'price', title: 'Preis', type: 'number', value: (w) => w.purchasePrice, format: 'currency', column: 'default' },
    {
      key: 'rack',
      title: 'Regal',
      type: 'string',
      value: () => null,
      values: rackNames,
      pivot: true,
      drill: { key: 'rack', op: 'contains' },
    },
    {
      key: 'placement',
      title: 'Regal-Platzierung',
      type: 'string',
      value: placement,
      order: [PLACEMENT_IN_RACK, PLACEMENT_PARTLY, PLACEMENT_UNPLACED],
    },
  ];
}

/** Durchsuchte Felder der Suche. */
export const CELLAR_SEARCH_KEYS = ['name', 'producer', 'region', 'grape'];

/** Frühere Adressparameter (`?type=Rot`, `?vintageFrom=2015` …). */
export const CELLAR_LEGACY: LegacyParam[] = [
  {
    param: 'type',
    key: 'type',
    kind: 'multi',
    map: (v) => WINE_TYPES.find((t) => t.value.toLowerCase() === v.toLowerCase())?.label ?? v,
  },
  { param: 'country', key: 'country', kind: 'multi' },
  { param: 'region', key: 'region', kind: 'multi' },
  { param: 'grape', key: 'grape', kind: 'multi' },
  { param: 'window', key: 'window', kind: 'multi' },
  { param: 'placement', key: 'placement', kind: 'multi' },
  { param: 'vintageFrom', key: 'vintage', kind: 'from' },
  { param: 'vintageTo', key: 'vintage', kind: 'to' },
];

export function cellarMeasures(): ListMeasure<Wine>[] {
  return [
    { key: 'bottles', title: 'Anzahl Flaschen', kind: 'sum', value: (w) => w.quantity, format: 'integer' },
    { key: 'wines', title: 'Anzahl Weine', kind: 'sum', value: () => 1, format: 'integer' },
    {
      key: 'price',
      title: 'Summe Kaufpreis',
      kind: 'sum',
      value: (w) => (w.purchasePrice === null ? null : w.purchasePrice * w.quantity),
      format: 'currency',
    },
  ];
}

export const CELLAR_PIVOT: PivotLayout = { rows: ['type'], cols: ['country'], data: ['bottles'] };
