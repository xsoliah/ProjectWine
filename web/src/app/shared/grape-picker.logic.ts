import { GrapeEntry, GrapeVariety, WineGrapeRequest } from '../core/models';
import { normalizeOrigin } from '../core/origins';

export function findGrape(varieties: readonly GrapeVariety[], name: string): GrapeVariety | null {
  const key = normalizeOrigin(name);
  return key ? (varieties.find((v) => normalizeOrigin(v.name) === key) ?? null) : null;
}

export function hasEntry(entries: readonly GrapeEntry[], name: string): boolean {
  const key = normalizeOrigin(name);
  return entries.some((e) => normalizeOrigin(e.name) === key);
}

/** Moves the entry at `index` by `delta` (-1 up, +1 down); out-of-range moves return the list unchanged. */
export function moveEntry<T>(entries: readonly T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= entries.length || target < 0 || target >= entries.length) return [...entries];
  const copy = [...entries];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

export function sumPercent(entries: readonly GrapeEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.percent ?? 0), 0);
}

/** Same rule as the API: 1 grape = single-varietal, 2+ = cuvée. */
export function classify(count: number): 'Rebsortenrein' | 'Cuvée' | null {
  return count === 0 ? null : count === 1 ? 'Rebsortenrein' : 'Cuvée';
}

/** Entry names that do not exist in the user's list yet. */
export function unknownNames(entries: readonly GrapeEntry[], varieties: readonly GrapeVariety[]): string[] {
  return entries.filter((e) => !findGrape(varieties, e.name)).map((e) => e.name);
}

/** Turns the entries into API requests; all names must be known (see `unknownNames`). */
export function toRequests(entries: readonly GrapeEntry[], varieties: readonly GrapeVariety[]): WineGrapeRequest[] {
  return entries.map((e) => {
    const variety = findGrape(varieties, e.name);
    if (!variety) throw new Error(`Unbekannte Rebsorte ${e.name}`);
    return { grapeId: variety.id, percent: e.percent };
  });
}
