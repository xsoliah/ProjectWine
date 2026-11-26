import { Wine } from './models';

export type DrinkWindowState = 'early' | 'ready' | 'late';

export interface DrinkWindowHint {
  state: DrinkWindowState;
  label: string;
}

/** Summarises a wine's drinking window relative to the given year; null when none is set. */
export function drinkWindow(
  wine: Pick<Wine, 'drinkFrom' | 'drinkUntil'>,
  year: number,
): DrinkWindowHint | null {
  const { drinkFrom: from, drinkUntil: until } = wine;
  if (from !== null && year < from) {
    return { state: 'early', label: `Noch lagern – ab ${from}` };
  }
  if (until !== null && year > until) {
    return { state: 'late', label: `Zeit zum Trinken war bis ${until}` };
  }
  if (until !== null) {
    return { state: 'ready', label: `Trinkreif bis ${until}` };
  }
  if (from !== null) {
    return { state: 'ready', label: `Trinkreif seit ${from}` };
  }
  return null;
}
