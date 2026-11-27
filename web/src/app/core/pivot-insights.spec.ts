import { describe, expect, it } from 'vitest';
import {
  averageOf,
  computeKpis,
  heatLevel,
  layoutSignature,
  pathByLabel,
  signatureOfFields,
  sumOf,
  topValues,
} from './pivot-insights';

describe('Kennzahlkacheln', () => {
  const rows = [
    { q: 3, p: 10 },
    { q: 2, p: null as number | null },
  ];
  it('rechnet aus den Zeilen, nicht aus dem Pivot', () => {
    const tiles = computeKpis(rows, [
      { key: 'b', title: 'Flaschen', format: 'integer', value: (r) => sumOf(r, (x) => x.q) },
      { key: 'p', title: 'Preis', format: 'decimal1', value: (r) => averageOf(r, (x) => x.p) },
    ]);
    expect(tiles.map((t) => t.text)).toEqual(['5', '10,0']);
  });
  it('zeigt einen Strich ohne Wert', () => {
    const tiles = computeKpis([] as number[], [{ key: 'b', title: 'Flaschen', format: 'integer', value: (r) => sumOf(r, (x) => x) }]);
    expect(tiles[0].text).toBe('–');
  });
});

describe('heatLevel', () => {
  it('stuft 1, 5 und 20 aufsteigend ein', () => {
    expect([1, 5, 20].map((v) => heatLevel(v, 1, 20))).toEqual([1, 2, 4]);
  });
  it('färbt nichts bei nur einem Wert oder ohne Wert', () => {
    expect(heatLevel(5, 5, 5)).toBe(0);
    expect(heatLevel(null, 1, 20)).toBe(0);
    expect(heatLevel(undefined, 1, 20)).toBe(0);
  });
});

describe('topValues', () => {
  it('liefert die größten N absteigend und ignoriert leere Werte', () => {
    const recs = [
      { p: 'A', m: 1 },
      { p: 'B', m: 5 },
      { p: 'C', m: 3 },
      { p: 'B', m: 1 },
      { p: null, m: 99 },
    ];
    expect(topValues(recs, 'p', 'm', 2)).toEqual(['B', 'C']);
  });
});

describe('Anordnungs-Signatur', () => {
  it('erkennt dieselbe Anordnung aus Pivot-Feldern wieder', () => {
    const fields = [
      { area: 'row', areaIndex: 1, dataField: 'region' },
      { area: 'row', areaIndex: 0, dataField: 'country' },
      { area: 'column', areaIndex: 0, dataField: 'type' },
      { area: 'data', areaIndex: 0, dataField: 'm_bottles' },
      { dataField: 'date', groupName: 'date' },
    ];
    expect(signatureOfFields(fields, 'm_')).toBe(layoutSignature({ rows: ['country', 'region'], cols: ['type'], data: ['bottles'] }));
  });
  it('nimmt für Datumsgruppen den Gruppennamen', () => {
    expect(signatureOfFields([{ area: 'row', areaIndex: 0, groupName: 'date' }], 'm_')).toBe(
      layoutSignature({ rows: ['date'], cols: [], data: [] }),
    );
  });
  it('unterscheidet andere Anordnungen', () => {
    expect(layoutSignature({ rows: ['a'], cols: [], data: [] })).not.toBe(layoutSignature({ rows: [], cols: ['a'], data: [] }));
  });
});

describe('pathByLabel', () => {
  const items = [
    { value: 'Italien', text: 'Italien', children: [{ value: 'Toskana', text: 'Toskana' }] },
    { value: 'Spanien', text: 'Spanien' },
  ];
  it('findet Ebene 1 und 2', () => {
    expect(pathByLabel(items, 'Spanien')).toEqual(['Spanien']);
    expect(pathByLabel(items, 'Italien - Toskana')).toEqual(['Italien', 'Toskana']);
  });
  it('liefert null, wenn nichts passt', () => {
    expect(pathByLabel(items, 'Gesamt')).toBeNull();
  });
});
