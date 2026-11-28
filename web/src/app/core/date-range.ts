/** Zeitraum (einschließlich Ende) eines Jahres, optional eines Quartals oder Monats; ohne Jahr nicht abbildbar. */
export function dateRange(parts: { year?: number; quarter?: number; month?: number }): [Date, Date] | null {
  const year = parts.year;
  if (year === undefined) return null;
  if (parts.month !== undefined) return [new Date(year, parts.month - 1, 1), new Date(year, parts.month, 0)];
  if (parts.quarter !== undefined) return [new Date(year, (parts.quarter - 1) * 3, 1), new Date(year, parts.quarter * 3, 0)];
  return [new Date(year, 0, 1), new Date(year, 11, 31)];
}
