import { ConsumptionKind, WineType } from './models';

export const WINE_TYPES: readonly { value: WineType; label: string }[] = [
  { value: 'Red', label: 'Rotwein' },
  { value: 'White', label: 'Weißwein' },
  { value: 'Rose', label: 'Rosé' },
  { value: 'Sparkling', label: 'Schaumwein' },
  { value: 'Dessert', label: 'Dessertwein' },
  { value: 'Fortified', label: 'Likörwein' },
  { value: 'Other', label: 'Sonstige' },
];

export const CONSUMPTION_KINDS: readonly { value: ConsumptionKind; label: string }[] = [
  { value: 'Drunk', label: 'Getrunken' },
  { value: 'Sold', label: 'Verkauft' },
  { value: 'Gifted', label: 'Verschenkt' },
];

export function wineTypeLabel(type: WineType): string {
  return WINE_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function kindLabel(kind: ConsumptionKind): string {
  return CONSUMPTION_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

export function counterpartyLabel(kind: ConsumptionKind): string {
  return kind === 'Sold' ? 'Käufer' : 'Beschenkte/r';
}
