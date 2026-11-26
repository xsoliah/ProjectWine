import {
  Column,
  Dimension,
  FilterDef,
  Measure,
  NO_VALUE,
  cellKey,
  csvCell,
  drillRows,
  filterRows,
  multiOptions,
  parseViewState,
  pivot,
  pivotCsv,
  serializeViewState,
  sortRows,
  tableCsv,
  toCsv,
  visibleColumns,
} from './list-views';

interface Row {
  name: string;
  type: string;
  country: string | null;
  grapes: string[];
  vintage: number | null;
  qty: number;
  rating: number | null;
  date: string;
}

const row = (o: Partial<Row>): Row => ({
  name: 'Wein',
  type: 'Rot',
  country: null,
  grapes: [],
  vintage: null,
  qty: 1,
  rating: null,
  date: '2026-01-01',
  ...o,
});

const type: Dimension<Row> = { key: 'type', title: 'Art', values: (r) => [r.type] };
const country: Dimension<Row> = { key: 'country', title: 'Land', values: (r) => (r.country ? [r.country] : []) };
const grape: Dimension<Row> = { key: 'grape', title: 'Rebsorte', values: (r) => r.grapes };
const bottles: Measure<Row> = { key: 'bottles', title: 'Flaschen', kind: 'sum', value: (r) => r.qty, format: String };
const avgRating: Measure<Row> = { key: 'rating', title: 'Ø', kind: 'avg', value: (r) => r.rating, format: String };

describe('sortRows', () => {
  const column: Column<Row> = { key: 'vintage', title: 'Jahrgang', type: 'number', value: (r) => r.vintage, defaultVisible: true };
  const rows = [row({ name: 'a', vintage: 2021 }), row({ name: 'b', vintage: null }), row({ name: 'c', vintage: 2018 })];

  it('sortiert aufsteigend und absteigend, leere Werte immer zuletzt', () => {
    expect(sortRows(rows, column, 'asc').map((r) => r.vintage)).toEqual([2018, 2021, null]);
    expect(sortRows(rows, column, 'desc').map((r) => r.vintage)).toEqual([2021, 2018, null]);
  });

  it('sortiert Texte ohne Beachtung der Groß-/Kleinschreibung', () => {
    const text: Column<Row> = { key: 'name', title: 'Name', type: 'text', value: (r) => r.name, defaultVisible: true };
    const sorted = sortRows([row({ name: 'banane' }), row({ name: 'Apfel' }), row({ name: 'Zitrone' })], text, 'asc');
    expect(sorted.map((r) => r.name)).toEqual(['Apfel', 'banane', 'Zitrone']);
  });

  it('sortiert Daten chronologisch', () => {
    const date: Column<Row> = { key: 'date', title: 'Datum', type: 'date', value: (r) => r.date, defaultVisible: true };
    const sorted = sortRows([row({ date: '2026-03-01' }), row({ date: '2025-12-31' })], date, 'asc');
    expect(sorted.map((r) => r.date)).toEqual(['2025-12-31', '2026-03-01']);
  });
});

describe('visibleColumns', () => {
  const columns: Column<Row>[] = ['name', 'type', 'country'].map((key, i) => ({
    key,
    title: key,
    type: 'text',
    value: () => null,
    defaultVisible: i < 2,
  }));

  it('nimmt ohne Auswahl die Standardspalten', () => {
    expect(visibleColumns(columns, null).map((c) => c.key)).toEqual(['name', 'type']);
  });

  it('behält die erste Spalte immer', () => {
    expect(visibleColumns(columns, ['country']).map((c) => c.key)).toEqual(['name', 'country']);
  });
});

describe('filterRows', () => {
  const defs: FilterDef<Row>[] = [
    { kind: 'text', key: 'q', title: 'Suche', texts: (r) => [r.name, r.country] },
    { kind: 'multi', key: 'type', title: 'Art', values: (r) => [r.type] },
    { kind: 'multi', key: 'country', title: 'Land', values: (r) => (r.country ? [r.country] : []) },
    { kind: 'range', key: 'vintage', title: 'Jahrgang', input: 'number', value: (r) => r.vintage },
    { kind: 'range', key: 'date', title: 'Zeitraum', input: 'date', value: (r) => r.date },
    { kind: 'min', key: 'rating', title: 'Bewertung', steps: [3, 4], value: (r) => r.rating },
  ];
  const rows = [
    row({ name: 'Sassicaia', type: 'Rot', country: 'Italien', vintage: 2018, rating: 5, date: '2025-06-01' }),
    row({ name: 'Soave', type: 'Weiß', country: 'Italien', vintage: 2021, rating: 3, date: '2026-02-01' }),
    row({ name: 'Rioja', type: 'Rot', country: 'Spanien', vintage: null, date: '2026-12-31' }),
  ];
  const names = (state: Record<string, string>) => filterRows(rows, defs, state).map((r) => r.name);

  it('verknüpft verschiedene Filter mit „und“', () => {
    expect(names({ type: 'Rot', country: 'Italien' })).toEqual(['Sassicaia']);
  });

  it('verknüpft Mehrfachauswahl mit „oder“', () => {
    expect(names({ country: 'Italien|Spanien' })).toEqual(['Sassicaia', 'Soave', 'Rioja']);
  });

  it('findet Einträge ohne Wert über „Ohne Angabe“', () => {
    const none = filterRows([row({ name: 'x' }), ...rows], defs, { country: NO_VALUE }).map((r) => r.name);
    expect(none).toEqual(['x']);
  });

  it('sucht ohne Beachtung von Groß-/Kleinschreibung und Akzenten', () => {
    expect(names({ q: 'SASSI' })).toEqual(['Sassicaia']);
    expect(names({ q: 'ital' })).toEqual(['Sassicaia', 'Soave']);
  });

  it('filtert Zahlenbereiche; Zeilen ohne Wert fallen heraus', () => {
    expect(names({ vintageFrom: '2019' })).toEqual(['Soave']);
    expect(names({ vintageTo: '2020' })).toEqual(['Sassicaia']);
  });

  it('filtert den Zeitraum inklusive der Grenzen', () => {
    expect(names({ dateFrom: '2026-01-01', dateTo: '2026-12-31' })).toEqual(['Soave', 'Rioja']);
  });

  it('filtert nach Mindestbewertung', () => {
    expect(names({ ratingMin: '4' })).toEqual(['Sassicaia']);
  });

  it('liefert alles ohne aktive Filter', () => {
    expect(names({})).toHaveLength(3);
  });

  it('leitet Auswahlmöglichkeiten aus den Daten ab', () => {
    const def = defs[2] as Extract<FilterDef<Row>, { kind: 'multi' }>;
    expect(multiOptions(def, [...rows, row({})])).toEqual(['Italien', 'Spanien', NO_VALUE]);
  });
});

describe('pivot', () => {
  const rows = [
    row({ type: 'Rot', country: 'Italien', qty: 3 }),
    row({ type: 'Weiß', country: 'Italien', qty: 2 }),
    row({ type: 'Rot', country: 'Spanien', qty: 4 }),
  ];

  it('zeigt Flaschen je Land und Weinart mit Summen', () => {
    const p = pivot(rows, country, type, bottles);
    expect(p.rowKeys).toEqual(['Italien', 'Spanien']);
    expect(p.colKeys).toEqual(['Rot', 'Weiß']);
    expect(p.cells.get(cellKey('Italien', 'Rot'))).toBe(3);
    expect(p.cells.get(cellKey('Italien', 'Weiß'))).toBe(2);
    expect(p.cells.get(cellKey('Spanien', 'Rot'))).toBe(4);
    expect(p.cells.has(cellKey('Spanien', 'Weiß'))).toBe(false);
    expect(p.rowTotals.get('Italien')).toBe(5);
    expect(p.rowTotals.get('Spanien')).toBe(4);
    expect(p.colTotals.get('Rot')).toBe(7);
    expect(p.colTotals.get('Weiß')).toBe(2);
    expect(p.grand).toBe(9);
  });

  it('sammelt fehlende Werte unter „Ohne Angabe“ als letzte Zeile', () => {
    const p = pivot([...rows, row({ qty: 2 })], country, type, bottles);
    expect(p.rowKeys).toEqual(['Italien', 'Spanien', NO_VALUE]);
    expect(p.rowTotals.get(NO_VALUE)).toBe(2);
  });

  it('mittelt Bewertungen ohne Leerwerte', () => {
    const p = pivot([row({ rating: 4 }), row({ rating: 5 }), row({ rating: null })], type, null, avgRating);
    expect(p.grand).toBe(4.5);
    expect(p.cells.get(cellKey('Rot', 'Gesamt'))).toBe(4.5);
  });

  it('zählt ein Cuvée bei jeder Rebsorte, in den Summen aber nur einmal', () => {
    const cuvee = row({ grapes: ['Merlot', 'Cabernet Sauvignon'], qty: 6 });
    const p = pivot([cuvee], grape, null, bottles);
    expect(p.cells.get(cellKey('Merlot', 'Gesamt'))).toBe(6);
    expect(p.cells.get(cellKey('Cabernet Sauvignon', 'Gesamt'))).toBe(6);
    expect(p.grand).toBe(6);
    expect(p.multiValued).toBe(true);
  });

  it('meldet keine Mehrfachzählung ohne Mehrwerte', () => {
    expect(pivot(rows, country, type, bottles).multiValued).toBe(false);
  });

  it('erzwingt Zeilen ohne Daten mit Summe 0', () => {
    const p = pivot(rows, country, type, bottles, ['Portugal']);
    expect(p.rowKeys).toContain('Portugal');
    expect(p.rowTotals.get('Portugal')).toBe(0);
  });

  it('ordnet Schlüssel nach fester Reihenfolge', () => {
    const ordered: Dimension<Row> = { ...type, order: ['Weiß', 'Rot'] };
    expect(pivot(rows, ordered, null, bottles).rowKeys).toEqual(['Weiß', 'Rot']);
  });

  it('sortiert Zahlen numerisch', () => {
    const vintage: Dimension<Row> = { key: 'v', title: 'J', values: (r) => (r.vintage ? [String(r.vintage)] : []) };
    const p = pivot([row({ vintage: 2020 }), row({ vintage: 998 }), row({ vintage: 2100 })], vintage, null, bottles);
    expect(p.rowKeys).toEqual(['998', '2020', '2100']);
  });

  it('exportiert das Pivot als CSV', () => {
    const p = pivot(rows, country, type, bottles);
    const csv = pivotCsv(p, 'Land', bottles as Measure<unknown>, true);
    expect(csv.split('\r\n')[0]).toBe('﻿Land;Rot;Weiß;Gesamt');
    expect(csv).toContain('Italien;3;2;5');
    expect(csv).toContain('Gesamt;7;2;9');
  });
});

describe('drillRows', () => {
  const rows = [
    row({ type: 'Rot', country: 'Italien' }),
    row({ type: 'Weiß', country: 'Italien' }),
    row({ type: 'Rot', country: 'Spanien' }),
    row({ type: 'Rot' }),
  ];

  it('liefert die Zeilen einer Zelle', () => {
    expect(drillRows(rows, country, 'Italien', type, 'Rot')).toHaveLength(1);
  });

  it('liefert die Zeilen einer Summe', () => {
    expect(drillRows(rows, country, 'Italien', type, null)).toHaveLength(2);
    expect(drillRows(rows, country, null, type, 'Rot')).toHaveLength(3);
  });

  it('findet Zeilen ohne Wert über „Ohne Angabe“', () => {
    expect(drillRows(rows, country, NO_VALUE, null, null)).toHaveLength(1);
  });
});

describe('CSV', () => {
  it('beginnt mit BOM und trennt mit Semikolon', () => {
    expect(toCsv(['A', 'B'], [[1, 'x']])).toBe('﻿A;B\r\n1;x\r\n');
  });

  it('entschärft Formelzeichen', () => {
    for (const text of ['=SUMME(A1)', '+1', '-1', '@x']) expect(csvCell(text)).toBe(`'${text}`);
  });

  it('lässt Zahlen und normalen Text unverändert, Dezimalkomma bei Zahlen', () => {
    expect(csvCell(-2)).toBe('-2');
    expect(csvCell(4.5)).toBe('4,5');
    expect(csvCell('Rot')).toBe('Rot');
    expect(csvCell(null)).toBe('');
  });

  it('setzt Zellen mit Trennzeichen oder Anführungszeichen in Anführungszeichen', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('sag "hi"')).toBe('"sag ""hi"""');
  });

  it('exportiert genau die übergebenen Zeilen und Spalten', () => {
    const columns: Column<Row>[] = [
      { key: 'name', title: 'Name', type: 'text', value: (r) => r.name, defaultVisible: true },
      { key: 'qty', title: 'Flaschen', type: 'number', value: (r) => r.qty, defaultVisible: true },
    ];
    const csv = tableCsv([row({ name: '=SUMME(A1)', qty: 2 }), row({ name: 'B', qty: 1 })], columns);
    expect(csv.split('\r\n')).toEqual(['﻿Name;Flaschen', "'=SUMME(A1);2", 'B;1', '']);
  });
});

describe('URL-Zustand', () => {
  const defs: FilterDef<Row>[] = [
    { kind: 'multi', key: 'type', title: 'Art', values: (r) => [r.type] },
    { kind: 'range', key: 'vintage', title: 'Jahrgang', input: 'number', value: (r) => r.vintage },
    { kind: 'range', key: 'date', title: 'Zeitraum', input: 'date', value: (r) => r.date },
  ];
  const defaults = {
    pivot: { row: 'type', col: 'country', measure: 'bottles' },
    dimensions: ['type', 'country'],
    measures: ['bottles', 'rating'],
    columns: ['name', 'type'],
  };

  it('fällt bei ungültigen Werten auf den Standard zurück', () => {
    const s = parseViewState(
      { view: 'kaputt', sort: 'nix', dir: 'quer', pr: 'x', pc: 'y', pm: 'z', vintageFrom: 'abc', dateTo: 'gestern', cols: 'a,b' },
      defaults,
      defs,
    );
    expect(s.view).toBe('tiles');
    expect(s.sort).toBe('');
    expect(s.dir).toBe('asc');
    expect(s.cols).toBeNull();
    expect(s.pivot).toEqual(defaults.pivot);
    expect(s.filters).toEqual({});
  });

  it('nimmt die gespeicherte Ansicht, wenn die URL keine nennt', () => {
    expect(parseViewState({}, defaults, defs, 'table').view).toBe('table');
    expect(parseViewState({ view: 'pivot' }, defaults, defs, 'table').view).toBe('pivot');
  });

  it('liest und schreibt Zustand verlustfrei', () => {
    const state = parseViewState(
      { view: 'pivot', sort: 'type', dir: 'desc', cols: 'name', pr: 'country', pc: 'none', pm: 'rating', type: 'Rot|Weiß', vintageFrom: '2018', dr: 'Italien' },
      defaults,
      defs,
    );
    expect(state.pivot).toEqual({ row: 'country', col: '', measure: 'rating' });
    expect(state.filters).toEqual({ type: 'Rot|Weiß', vintageFrom: '2018' });
    const out = serializeViewState(state, defaults);
    expect(out).toMatchObject({ view: 'pivot', sort: 'type', dir: 'desc', cols: 'name', pr: 'country', pc: 'none', pm: 'rating', dr: 'Italien', dc: null });
  });

  it('lässt Standardwerte aus der URL weg', () => {
    const out = serializeViewState(parseViewState({}, defaults, defs), defaults);
    expect(out).toMatchObject({ view: 'tiles', sort: null, pr: null, pc: null, pm: null });
  });
});
