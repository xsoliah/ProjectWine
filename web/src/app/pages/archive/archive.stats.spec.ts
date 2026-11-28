import { describe, expect, it } from 'vitest';
import { ArchiveEntry } from '../../core/models';
import { archiveStats } from './archive.stats';

const entry = (o: Partial<ArchiveEntry> & { quantity: number }): ArchiveEntry =>
  ({ id: 'e', wineId: 'w', wineName: 'Wein', producer: null, vintage: null, wineType: 'Red', kind: 'Drunk', date: '2026-03-01', counterparty: null, price: null, rating: null, tastingNote: null, ...o }) as ArchiveEntry;

describe('archiveStats', () => {
  it('mittelt die Bewertung ohne unbewertete Einträge', () => {
    const s = archiveStats([entry({ quantity: 1, rating: 4 }), entry({ quantity: 1, rating: 5 }), entry({ quantity: 1 })]);
    expect(s.tiles.map((t) => t.text).slice(0, 3)).toEqual(['3', '3', '4,5']);
  });

  it('zeigt Striche ohne Einträge', () => {
    expect(archiveStats([]).tiles.map((t) => t.text)).toEqual(['–', '–', '–', '–']);
  });

  it('teilt nach Jahr absteigend mit Anteil und Zeitraum-Filter', () => {
    const s = archiveStats([entry({ quantity: 5, date: '2025-06-01' }), entry({ quantity: 3, date: '2026-01-10' })]);
    expect(s.byYear.map((r) => [r.label, r.bottles, r.share])).toEqual([
      ['2026', 3, 38],
      ['2025', 5, 63],
    ]);
    const range = s.byYear[0].filter as unknown[];
    expect(range[1]).toBe('and');
    expect((range[0] as unknown[])[2]).toEqual(new Date(2026, 0, 1));
    expect((range[2] as unknown[])[2]).toEqual(new Date(2026, 11, 31));
  });

  it('teilt nach Abgangsart, Weinart und Bewertung', () => {
    const s = archiveStats([
      entry({ quantity: 2, kind: 'Sold' }),
      entry({ quantity: 3, kind: 'Drunk', wineType: 'White', rating: 6 }),
      entry({ quantity: 1, kind: 'Drunk' }),
    ]);
    expect(s.byKind.map((r) => [r.label, r.bottles])).toEqual([
      ['Getrunken', 4],
      ['Verkauft', 2],
    ]);
    expect(s.byKind[0].filter).toEqual([['kind', '=', 'Getrunken']]);
    expect(s.byType.map((r) => [r.label, r.bottles])).toEqual([
      ['Rotwein', 3],
      ['Weißwein', 3],
    ]);
    expect(s.byRating.at(-1)?.label).toBe('Ohne Bewertung');
    expect(s.byRating.at(-1)?.filter).toEqual([['rating', '=', null]]);
  });
});
