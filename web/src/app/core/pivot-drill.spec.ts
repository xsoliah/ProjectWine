import { describe, expect, it } from 'vitest';
import { drillFilter, dateRange } from './pivot-drill';
import { ListField } from './list-model';

const fields: ListField<unknown>[] = [
  { key: 'country', title: 'Land', type: 'string', value: () => null },
  { key: 'region', title: 'Region', type: 'string', value: () => null },
  { key: 'vintage', title: 'Jahrgang', type: 'number', value: () => null },
  { key: 'grape', title: 'Rebsorte', type: 'string', value: () => null, values: () => [], drill: { key: 'grape', op: 'contains' } },
  { key: 'date', title: 'Datum', type: 'date', value: () => null },
  { key: 'types', title: 'Weinarten', type: 'string', value: () => null, drill: null },
];

describe('drillFilter', () => {
  it('verknüpft alle Ebenen mit „und“', () => {
    const e = drillFilter([
      { key: 'country', value: 'Italien' },
      { key: 'region', value: 'Toskana' },
      { key: 'vintage', value: 2019 },
    ], fields);
    expect(e).toEqual([['country', '=', 'Italien'], 'and', ['region', '=', 'Toskana'], 'and', ['vintage', '=', 2019]]);
  });

  it('Zwischensumme enthält nur die vorhandenen Ebenen', () => {
    expect(drillFilter([{ key: 'country', value: 'Italien' }], fields)).toEqual(['country', '=', 'Italien']);
    expect(drillFilter([], fields)).toBeNull();
  });

  it('„Ohne Angabe“ wird zur Leer-Bedingung', () => {
    expect(drillFilter([{ key: 'region', value: 'Ohne Angabe' }], fields)).toEqual(['region', '=', null]);
    expect(drillFilter([{ key: 'vintage', value: null }], fields)).toEqual(['vintage', '=', null]);
  });

  it('Rebsorten nutzen „enthält“, nicht auffindbare Felder entfallen', () => {
    expect(drillFilter([{ key: 'grape', value: 'Merlot' }, { key: 'types', value: 'x' }, { key: 'fremd', value: 1 }], fields)).toEqual(['grape', 'contains', 'Merlot']);
  });

  it('Jahr, Quartal und Monat werden zu einem Zeitraum', () => {
    const e = drillFilter([
      { key: 'date', interval: 'year', value: 2026 },
      { key: 'date', interval: 'month', value: 3 },
    ], fields)!;
    expect(e).toEqual([['date', '>=', new Date(2026, 2, 1)], 'and', ['date', '<=', new Date(2026, 2, 31)]]);
  });

  it('berechnet Zeiträume', () => {
    expect(dateRange({ year: 2026 })).toEqual([new Date(2026, 0, 1), new Date(2026, 11, 31)]);
    expect(dateRange({ year: 2026, quarter: 2 })).toEqual([new Date(2026, 3, 1), new Date(2026, 5, 30)]);
    expect(dateRange({ year: 2024, month: 2 })).toEqual([new Date(2024, 1, 1), new Date(2024, 1, 29)]);
    expect(dateRange({ month: 3 })).toBeNull();
  });
});
