import { beforeAll, describe, expect, it } from 'vitest';
import { FilterExpr, andFilters, ensureFilterEngine, filterRecords, filterText, legacyFilter, parseFilter, serializeFilter } from './filter-expr';
import { ListField, toRecords } from './list-model';

interface Wine {
  type: string;
  country: string | null;
  vintage: number | null;
  grapes: string[];
  bought: string | null;
}

const field = <K extends keyof Wine>(key: K, title: string, type: ListField<Wine>['type'], value: (w: Wine) => never): ListField<Wine> => ({
  key,
  title,
  type,
  value,
});

const fields: ListField<Wine>[] = [
  field('type', 'Weinart', 'string', (w) => w.type as never),
  field('country', 'Land', 'string', (w) => w.country as never),
  field('vintage', 'Jahrgang', 'number', (w) => w.vintage as never),
  { key: 'grape', title: 'Rebsorte', type: 'string', value: () => null, values: (w) => w.grapes },
  field('bought', 'Gekauft', 'date', (w) => (w.bought ? new Date(w.bought) : null) as never),
];

const wines: Wine[] = [
  { type: 'Rot', country: 'Italien', vintage: 2016, grapes: ['Sangiovese'], bought: '2026-03-10T00:00:00' },
  { type: 'Rot', country: 'Spanien', vintage: 2019, grapes: ['Merlot', 'Cabernet'], bought: '2026-04-01T00:00:00' },
  { type: 'Weiß', country: 'Italien', vintage: 2021, grapes: [], bought: null },
  { type: 'Rosé', country: null, vintage: null, grapes: ['Merlot'], bought: '2025-12-31T00:00:00' },
];

beforeAll(() => ensureFilterEngine());

const run = (expr: FilterExpr | null) => filterRecords(toRecords(wines, fields), expr).map((r) => r.__row);

describe('filterRecords', () => {
  it('ohne Ausdruck bleibt alles', () => {
    expect(run(null)).toHaveLength(4);
  });

  it('wertet Oder-Gruppe in Und-Gruppe aus', () => {
    const expr = [['type', '=', 'Rot'], 'and', [['country', '=', 'Italien'], 'or', ['country', '=', 'Spanien']]];
    expect(run(expr)).toEqual([wines[0], wines[1]]);
  });

  it('wertet Negation aus', () => {
    expect(run(['!', ['type', '=', 'Rot']])).toEqual([wines[2], wines[3]]);
  });

  it('wertet tief verschachtelte Negation aus', () => {
    const expr = ['!', [['type', '=', 'Rot'], 'or', ['!', ['country', '=', 'Italien']]]];
    expect(run(expr)).toEqual([wines[2]]);
  });

  it('wertet between, anyof und isblank aus', () => {
    expect(run(['vintage', 'between', [2015, 2019]])).toEqual([wines[0], wines[1]]);
    expect(run(['country', 'anyof', ['Italien', 'Spanien']])).toEqual([wines[0], wines[1], wines[2]]);
    expect(run(['country', 'noneof', ['Italien']])).toEqual([wines[1], wines[3]]);
    expect(run(['country', 'isblank'])).toEqual([wines[3]]);
    expect(run(['country', '=', null])).toEqual([wines[3]]);
    expect(run(['country', 'isnotblank'])).toHaveLength(3);
  });

  it('findet mehrwertige Felder per „enthält“ im Text', () => {
    expect(run(['grape', 'contains', 'Merlot'])).toEqual([wines[1], wines[3]]);
  });

  it('vergleicht Datumswerte', () => {
    expect(run(['bought', 'between', [new Date(2026, 2, 1), new Date(2026, 2, 31)]])).toEqual([wines[0]]);
    expect(run(['bought', '>=', new Date(2026, 3, 1)])).toEqual([wines[1]]);
  });

  it('ein halber Bereich filtert nur eine Seite', () => {
    expect(run(['vintage', 'between', [2019, null]])).toEqual([wines[1], wines[2]]);
  });
});


describe('Adresse', () => {
  const expr: FilterExpr = [['type', '=', 'Rot'], 'and', ['bought', 'between', [new Date(2026, 2, 1), new Date(2026, 2, 31)]]];

  it('serialisiert und liest zurück inklusive Datum', () => {
    const json = serializeFilter(expr, fields)!;
    expect(json).toContain('2026-03-01');
    const back = parseFilter(json, fields)!;
    expect(back).toEqual(expr);
    expect(run(back)).toEqual([wines[0]]);
  });

  it('ungültiges JSON, Aufbau oder Feld ergibt keinen Filter', () => {
    expect(parseFilter('{kaputt', fields)).toBeNull();
    expect(parseFilter('"text"', fields)).toBeNull();
    expect(parseFilter('[["a","b"]]', fields)).toBeNull();
    expect(parseFilter('[["unbekannt","=","x"]]', fields)).toBeNull();
    expect(parseFilter('', fields)).toBeNull();
  });

  it('übersetzt frühere Parameter', () => {
    const legacy = [
      { param: 'type', key: 'type', kind: 'multi' as const },
      { param: 'vintageFrom', key: 'vintage', kind: 'from' as const },
    ];
    const e = legacyFilter({ type: 'Rot|Weiß', vintageFrom: '2017' }, legacy, fields)!;
    expect(run(e)).toEqual([wines[1], wines[2]]);
    expect(legacyFilter({}, legacy, fields)).toBeNull();
  });

  it('andFilters verknüpft nur vorhandene Teile', () => {
    expect(andFilters(null, undefined)).toBeNull();
    expect(andFilters(['a', '=', 1])).toEqual(['a', '=', 1]);
    expect(andFilters(['a', '=', 1], null, ['b', '=', 2])).toEqual([['a', '=', 1], 'and', ['b', '=', 2]]);
  });
});

describe('filterText', () => {
  it('klammert verschachtelte Gruppen', () => {
    const expr = [['type', '=', 'Rot'], 'and', [['country', '=', 'Italien'], 'or', ['country', '=', 'Spanien']]];
    expect(filterText(expr, fields)).toBe('Weinart ist Rot und (Land ist Italien oder Land ist Spanien)');
  });

  it('beschreibt Negation und Bereiche', () => {
    expect(filterText(['!', ['type', '=', 'Rot']], fields)).toBe('nicht (Weinart ist Rot)');
    expect(filterText(['vintage', 'between', [2015, 2019]], fields)).toBe('Jahrgang zwischen 2015 und 2019');
  });
});
