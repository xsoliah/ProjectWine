import { Country, Region } from './models';

/** Same rule as the API: names are compared trimmed and case-insensitively. */
export function normalizeOrigin(name: string | null | undefined): string {
  return (name ?? '').trim().toLocaleUpperCase('de');
}

export function findCountry(countries: readonly Country[], name: string | null | undefined): Country | null {
  const key = normalizeOrigin(name);
  return key ? (countries.find((c) => normalizeOrigin(c.name) === key) ?? null) : null;
}

export function findRegion(country: Country | null, name: string | null | undefined): Region | null {
  const key = normalizeOrigin(name);
  return country && key ? (country.regions.find((r) => normalizeOrigin(r.name) === key) ?? null) : null;
}

/** "Toskana, Italien", "Italien" or null. */
export function formatOrigin(country: { name: string } | null, region: { name: string } | null): string | null {
  const parts = [region?.name, country?.name].filter((p): p is string => !!p);
  return parts.length ? parts.join(', ') : null;
}
