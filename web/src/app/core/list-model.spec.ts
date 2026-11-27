import { describe, expect, it } from 'vitest';
import { ListField, ListMeasure, cellText, csvCell, hasMultiplicity, joinValues, parseIsoDate, tableCsv, toCsv, toIsoDate, toRecords } from './list-model';

interface Row {
  name: string;
  year: number | null;
  price: number | null;
  grapes: string[];
  date: string | null;
}

const fields: ListField<Row>[] = [
  { key: 'name', title: 'Name', type: 'string', value: (r) => r.name, column: 'default' },
  { key: 'year', title: 'Jahr', type: 'number', value: (r) => r.year, column: 'default', pivot: true },
  { key: 'price', title: 'Preis', type: 'number', value: (r) => r.price, format: 'currency', column: 'default' },
  { key: 'grape', title: 'Rebsorte', type: 'string', value: () => null, values: (r) => r.grapes, pivot: true },
  { key: 'date', title: 'Datum', type: 'date', value: (r) => parseIsoDate(r.date), column: 'optional', pivot: true },
];
const measures: ListMeasure<Row>[] = [{ key: 'count', title: 'Anzahl', kind: 'sum', value: () => 1, format: 'integer' }];

const rows: Row[] = [
  { name: 'A', year: 2019, price: 12.5, grapes: ['Merlot', 'Syrah'], date: '2026-03-01' },
  { name: '=Summe', year: null, price: null, grapes: [], date: null },
];

describe('toRecords', () => {
  it('bildet Werte, leere Werte als null und Kennzahlen unter m_', () => {
    const [a, b] = toRecords(rows, fields, measures);
    expect(a['year']).toBe(2019);
    expect(a['grape']).toBe('Merlot, Syrah');
    expect(a['date']).toEqual(new Date(2026, 2, 1));
    expect(a['m_count']).toBe(1);
    expect(a.__row).toBe(rows[0]);
    expect(b['year']).toBeNull();
    expect(b['grape']).toBeNull();
    expect(b['date']).toBeNull();
  });

  it('fächert mehrwertige Felder nur auf Wunsch auf', () => {
    const fanned = toRecords(rows, fields, measures, new Set(['grape']));
    expect(fanned.map((r) => r['grape'])).toEqual(['Merlot', 'Syrah', null]);
    expect(fanned.map((r) => r.__row.name)).toEqual(['A', 'A', '=Summe']);
  });

  it('erkennt Mehrfachzuordnung', () => {
    expect(hasMultiplicity(rows, fields[3])).toBe(true);
    expect(hasMultiplicity([rows[1]], fields[3])).toBe(false);
    expect(hasMultiplicity(rows, fields[0])).toBe(false);
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
