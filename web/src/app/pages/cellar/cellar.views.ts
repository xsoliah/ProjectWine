import { drinkWindow } from '../../core/drink-window';
import { formatPrice } from '../../core/format';
import { WINE_TYPES, wineTypeLabel } from '../../core/labels';
import { Column, Dimension, FilterDef, Measure, NO_VALUE, PivotConfig } from '../../core/list-views';
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

export const WINDOW_OPTIONS = ['Trinkreif', 'Noch warten', 'Überschritten', NO_VALUE] as const;
export const PLACEMENT_IN_RACK = 'In Regal';
export const PLACEMENT_UNPLACED = 'Ohne Fach';

const text = (value: string | null | undefined): string[] => (value ? [value] : []);
const rackNames = (wine: Wine): string[] => [...new Set(wine.slots.map((s) => s.rackName))];

function windowText(wine: Wine): string {
  const { drinkFrom: from, drinkUntil: until } = wine;
  if (from !== null && until !== null) return `${from}–${until}`;
  if (from !== null) return `ab ${from}`;
  if (until !== null) return `bis ${until}`;
  return '';
}

/** Spalten der Kellertabelle; die erste (Name) ist immer sichtbar. */
export function cellarColumns(): Column<Wine>[] {
  return [
    { key: 'name', title: 'Name', type: 'text', value: (w) => w.name, defaultVisible: true },
    { key: 'producer', title: 'Winzer', type: 'text', value: (w) => w.producer, defaultVisible: true },
    { key: 'vintage', title: 'Jahrgang', type: 'number', value: (w) => w.vintage, defaultVisible: true },
    { key: 'type', title: 'Art', type: 'text', value: (w) => wineTypeLabel(w.type), defaultVisible: true },
    { key: 'country', title: 'Land', type: 'text', value: (w) => w.country?.name ?? null, defaultVisible: true },
    { key: 'region', title: 'Region', type: 'text', value: (w) => w.region?.name ?? null, defaultVisible: true },
    {
      key: 'grapes',
      title: 'Rebsorten',
      type: 'text',
      value: (w) => (w.grapes.length > 0 ? w.grapes.map((g) => g.name).join(', ') : null),
      defaultVisible: false,
    },
    { key: 'quantity', title: 'Flaschen', type: 'number', value: (w) => w.quantity, defaultVisible: true },
    {
      key: 'window',
      title: 'Trinkfenster',
      type: 'number',
      value: (w) => w.drinkFrom ?? w.drinkUntil,
      display: windowText,
      defaultVisible: true,
    },
    {
      key: 'price',
      title: 'Preis',
      type: 'number',
      value: (w) => w.purchasePrice,
      display: (w) => formatPrice(w.purchasePrice),
      defaultVisible: true,
    },
  ];
}

export function cellarFilters(year: number): FilterDef<Wine>[] {
  return [
    {
      kind: 'text',
      key: 'q',
      title: 'Suche',
      texts: (w) => [w.name, w.producer, w.region?.name, ...w.grapes.map((g) => g.name)],
    },
    { kind: 'multi', key: 'type', title: 'Weinart', values: (w) => [wineTypeLabel(w.type)], options: WINE_TYPES.map((t) => t.label) },
    { kind: 'multi', key: 'country', title: 'Land', values: (w) => text(w.country?.name) },
    { kind: 'multi', key: 'region', title: 'Region', values: (w) => text(w.region?.name) },
    { kind: 'multi', key: 'grape', title: 'Rebsorte', values: (w) => w.grapes.map((g) => g.name) },
    { kind: 'range', key: 'vintage', title: 'Jahrgang', input: 'number', value: (w) => w.vintage },
    {
      kind: 'multi',
      key: 'window',
      title: 'Trinkfenster',
      values: (w) => text(windowState(w, year)),
      options: WINDOW_OPTIONS,
    },
    {
      kind: 'multi',
      key: 'placement',
      title: 'Regal-Platzierung',
      values: (w) => [...(w.slots.length > 0 ? [PLACEMENT_IN_RACK] : []), ...(w.unplacedCount > 0 ? [PLACEMENT_UNPLACED] : [])],
      options: [PLACEMENT_IN_RACK, PLACEMENT_UNPLACED],
    },
  ];
}

export function cellarDimensions(year: number): Dimension<Wine>[] {
  return [
    { key: 'type', title: 'Weinart', values: (w) => [wineTypeLabel(w.type)], order: WINE_TYPES.map((t) => t.label) },
    { key: 'country', title: 'Land', values: (w) => text(w.country?.name) },
    { key: 'region', title: 'Region', values: (w) => text(w.region?.name) },
    { key: 'grape', title: 'Rebsorte', values: (w) => w.grapes.map((g) => g.name) },
    { key: 'producer', title: 'Winzer', values: (w) => text(w.producer) },
    { key: 'vintage', title: 'Jahrgang', values: (w) => (w.vintage === null ? [] : [String(w.vintage)]) },
    {
      key: 'window',
      title: 'Trinkfenster',
      values: (w) => text(windowState(w, year)),
      order: ['Trinkreif', 'Noch warten', 'Überschritten'],
    },
    { key: 'rack', title: 'Regal', values: rackNames },
  ];
}

const integer = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export function cellarMeasures(): Measure<Wine>[] {
  return [
    { key: 'bottles', title: 'Anzahl Flaschen', kind: 'sum', value: (w) => w.quantity, format: (v) => integer.format(v) },
    { key: 'wines', title: 'Anzahl Weine', kind: 'sum', value: () => 1, format: (v) => integer.format(v) },
    {
      key: 'price',
      title: 'Summe Kaufpreis',
      kind: 'sum',
      value: (w) => (w.purchasePrice === null ? null : w.purchasePrice * w.quantity),
      format: (v) => formatPrice(v),
    },
  ];
}

export const CELLAR_PIVOT: PivotConfig = { row: 'type', col: 'country', measure: 'bottles' };
