import { describe, expect, it } from 'vitest';
import { Wine, WineType } from '../../core/models';
import { cellarStats } from './cellar.stats';

interface Opts {
  name?: string;
  type?: WineType;
  country?: string | null;
  region?: string | null;
  quantity: number;
  price?: number | null;
  racks?: Record<string, number>;
  drinkFrom?: number | null;
  drinkUntil?: number | null;
}

function wine(o: Opts): Wine {
  const slots = Object.entries(o.racks ?? {}).flatMap(([rack, n]) =>
    Array.from({ length: n }, (_, i) => ({ slotId: `${rack}${i}`, rackId: rack, rackName: rack, row: 1, column: i + 1 })),
  );
  return {
    id: o.name ?? 'w',
    name: o.name ?? 'Wein',
    type: o.type ?? 'Red',
    country: o.country ? { id: o.country, name: o.country } : null,
    region: o.region ? { id: o.region, name: o.region } : null,
    grapes: [],
    quantity: o.quantity,
    slots,
    unplacedCount: o.quantity - slots.length,
    purchasePrice: o.price ?? null,
    drinkFrom: o.drinkFrom ?? null,
    drinkUntil: o.drinkUntil ?? null,
  } as unknown as Wine;
}

describe('cellarStats Kennzahlen', () => {
  it('berechnet Flaschen, Weine und geschätzten Wert ohne Weine ohne Preis', () => {
    const s = cellarStats(
      [wine({ name: 'Zweigelt', quantity: 6, price: 12 }), wine({ name: 'Sassicaia', quantity: 2, price: 250 }), wine({ name: 'Hauswein', quantity: 3 })],
      2026,
    );
    expect(s.tiles.map((t) => t.text)).toEqual(['11', '3', expect.stringContaining('572,00')]);
    expect(s.tiles[2].hint).toBe('1 Wein ohne Einkaufspreis nicht eingerechnet');
  });

  it('zeigt Striche ohne Weine', () => {
    expect(cellarStats([], 2026).tiles.map((t) => t.text)).toEqual(['–', '–', '–']);
  });
});

describe('cellarStats Regale', () => {
  it('fasst Weinarten, Regionen und Wert je Regal zusammen', () => {
    const s = cellarStats(
      [
        wine({ name: 'a', quantity: 3, price: 20, region: 'Toskana', racks: { links: 3 } }),
        wine({ name: 'b', quantity: 1, price: 30, type: 'White', region: 'Wachau', racks: { links: 1 } }),
      ],
      2026,
    );
    expect(s.racks).toHaveLength(1);
    const card = s.racks[0];
    expect(card.name).toBe('links');
    expect(card.bottles).toBe(4);
    expect(card.value).toBe(90);
    expect(card.types).toEqual([
      { label: 'Rotwein', bottles: 3 },
      { label: 'Weißwein', bottles: 1 },
    ]);
    expect(card.regions).toEqual([
      { label: 'Toskana', bottles: 3 },
      { label: 'Wachau', bottles: 1 },
    ]);
    expect(card.filter).toEqual([['rack', 'contains', 'links']]);
  });

  it('verteilt einen Wein auf zwei Regale und behält die Gesamtzahl', () => {
    const s = cellarStats([wine({ quantity: 4, racks: { A: 3, B: 1 } })], 2026);
    expect(s.racks.map((r) => [r.name, r.bottles])).toEqual([
      ['A', 3],
      ['B', 1],
    ]);
    expect(s.tiles[0].text).toBe('4');
  });

  it('sammelt Flaschen ohne Fach zuletzt', () => {
    const s = cellarStats([wine({ quantity: 5, racks: { A: 3 } })], 2026);
    expect(s.racks.map((r) => [r.name, r.bottles])).toEqual([
      ['A', 3],
      ['Ohne Fach', 2],
    ]);
  });

  it('ordnet Flaschen ohne Region unter „Ohne Region“ und begrenzt die Regionen', () => {
    const wines = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((r) => wine({ name: r, quantity: 1, region: r, racks: { A: 1 } }));
    wines.push(wine({ name: 'x', quantity: 1, racks: { A: 1 } }));
    const card = cellarStats(wines, 2026).racks[0];
    expect(card.regions).toHaveLength(5);
    expect(card.regionsMore).toBe(2);
    expect(card.bottles).toBe(7);
  });
});

describe('cellarStats Aufteilungen', () => {
  const wines = [
    wine({ name: 'a', quantity: 4, country: 'Italien', region: 'Toskana', price: 10 }),
    wine({ name: 'b', quantity: 2, country: 'Italien', region: 'Piemont' }),
    wine({ name: 'c', quantity: 4, country: 'Spanien' }),
  ];

  it('teilt nach Land mit Regionen darunter, Anteil und Filter', () => {
    const [italy, spain] = cellarStats(wines, 2026).byCountry;
    expect([italy.label, italy.bottles, italy.share, italy.value]).toEqual(['Italien', 6, 60, 40]);
    expect(italy.children?.map((c) => [c.label, c.bottles])).toEqual([
      ['Toskana', 4],
      ['Piemont', 2],
    ]);
    expect(italy.children?.[0].filter).toEqual([[['country', '=', 'Italien']], 'and', [['region', '=', 'Toskana']]]);
    expect([spain.label, spain.bottles, spain.share, spain.value]).toEqual(['Spanien', 4, 40, null]);
  });

  it('sortiert nach Flaschen, dann alphabetisch, „Ohne Angabe“ zuletzt', () => {
    const rows = cellarStats(
      [
        wine({ quantity: 3, country: 'Spanien' }),
        wine({ quantity: 3, country: 'Italien' }),
        wine({ quantity: 5, country: 'Frankreich' }),
        wine({ quantity: 2 }),
      ],
      2026,
    ).byCountry;
    expect(rows.map((r) => r.label)).toEqual(['Frankreich', 'Italien', 'Spanien', 'Ohne Angabe']);
    expect(rows[3].filter).toEqual([['country', '=', null]]);
  });

  it('zählt ein Cuvée nur einmal, auch mit mehreren Rebsorten', () => {
    const cuvee = { ...wine({ quantity: 6, country: 'Italien' }), grapes: [{ name: 'Merlot' }, { name: 'Cabernet' }], isCuvee: true } as unknown as Wine;
    const s = cellarStats([cuvee], 2026);
    expect(s.byType[0].bottles).toBe(6);
    expect(s.byCountry[0].bottles).toBe(6);
    expect(s.byWindow[0].bottles).toBe(6);
  });

  it('teilt nach Trinkfenster', () => {
    const s = cellarStats(
      [wine({ quantity: 2, drinkFrom: 2020, drinkUntil: 2030 }), wine({ quantity: 1, drinkFrom: 2030, drinkUntil: 2035 }), wine({ quantity: 1 })],
      2026,
    );
    expect(s.byWindow.map((r) => [r.label, r.bottles])).toEqual([
      ['Trinkreif', 2],
      ['Noch warten', 1],
      ['Ohne Angabe', 1],
    ]);
  });
});
