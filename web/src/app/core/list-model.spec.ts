import { describe, expect, it } from 'vitest';
import { ListField, cellText, csvCell, joinValues, parseIsoDate, parseView, tableCsv, toCsv, toIsoDate, toRecords } from './list-model';

interface Row {
  name: string;
  year: number | null;
  price: number | null;
  grapes: string[];
  date: string | null;
}

const fields: ListField<Row>[] = [
  { key: 'name', title: 'Name', type: 'string', value: (r) => r.name, column: 'default' },
  { key: 'year', title: 'Jahr', type: 'number', value: (r) => r.year, column: 'default' },
  { key: 'price', title: 'Preis', type: 'number', value: (r) => r.price, format: 'currency', column: 'default' },
  { key: 'grape', title: 'Rebsorte', type: 'string', value: () => null, values: (r) => r.grapes },
  { key: 'date', title: 'Datum', type: 'date', value: (r) => parseIsoDate(r.date), column: 'optional' },
];

const rows: Row[] = [
  { name: 'A', year: 2019, price: 12.5, grapes: ['Merlot', 'Syrah'], date: '2026-03-01' },
  { name: '=Summe', year: null, price: null, grapes: [], date: null },
];

describe('toRecords', () => {
  it('bildet Werte, leere Werte als null und Datensätze', () => {
    const [a, b] = toRecords(rows, fields);
    expect(a['year']).toBe(2019);
    expect(a['grape']).toBe('Merlot, Syrah');
    expect(a['date']).toEqual(new Date(2026, 2, 1));
    expect(a.__row).toBe(rows[0]);
    expect(b['year']).toBeNull();
    expect(b['grape']).toBeNull();
    expect(b['date']).toBeNull();
  });
});

describe('Anzeige und CSV', () => {
  it('formatiert Zellen deutsch', () => {
    expect(cellText(fields[2], rows[0])).toContain('12,50');
    expect(cellText(fields[3], rows[0])).toBe('Merlot, Syrah');
    expect(cellText(fields[4], rows[0])).toBe('01.03.2026');
    expect(cellText(fields[1], rows[1])).toBe('');
  });

  it('erzeugt CSV mit BOM, Semikolon und Formelschutz', () => {
    const csv = tableCsv(rows, [fields[0], fields[1]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain("Name;Jahr\r\nA;2019\r\n'=Summe;\r\n");
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell(1.5)).toBe('1,5');
    expect(toCsv(['x'], [[null]])).toBe('﻿x\r\n\r\n');
  });

  it('wandelt Datum ohne Zeitzonenverschiebung', () => {
    expect(toIsoDate(parseIsoDate('2026-12-31')!)).toBe('2026-12-31');
    expect(parseIsoDate('kaputt')).toBeNull();
    expect(joinValues(['a', '', 'a', 'b'])).toBe('a, b');
    expect(joinValues([])).toBeNull();
  });
});

describe('parseView', () => {
  it('übernimmt zulässige Ansichten', () => {
    expect(parseView('table')).toBe('table');
    expect(parseView('stats')).toBe('stats');
  });

  it('macht aus einer gemerkten Ansicht „pivot“ die Statistik', () => {
    expect(parseView('pivot')).toBe('stats');
  });

  it('öffnet „pivot“ als Kacheln, wo es keine Statistik gibt', () => {
    expect(parseView('pivot', ['tiles', 'table'])).toBe('tiles');
  });

  it('ignoriert Unbekanntes und nicht angebotene Ansichten', () => {
    expect(parseView('chart')).toBeNull();
    expect(parseView(undefined)).toBeNull();
    expect(parseView('stats', ['tiles', 'table'])).toBeNull();
  });
});
