const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatPrice(value: number | null): string {
  return value === null ? '' : euro.format(value);
}

/** "2024-05-31" becomes "31.05.2024". */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

/** Today in the local time zone as yyyy-MM-dd (the API's DateOnly format). */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function wineTitle(wine: { name: string; vintage: number | null }): string {
  return wine.vintage === null ? wine.name : `${wine.name} ${wine.vintage}`;
}
