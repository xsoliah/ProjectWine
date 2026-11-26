import { GrapeVariety } from '../core/models';
import { classify, hasEntry, moveEntry, sumPercent, toRequests, unknownNames } from './grape-picker.logic';

const varieties: GrapeVariety[] = [
  { id: 'cs', name: 'Cabernet Sauvignon', wineCount: 1 },
  { id: 'cf', name: 'Cabernet Franc', wineCount: 0 },
];

describe('grape picker logic', () => {
  it('moves entries up and down and ignores moves past the ends', () => {
    expect(moveEntry(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveEntry(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveEntry(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveEntry(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });

  it('sums the shares and treats missing ones as zero', () => {
    expect(sumPercent([{ name: 'a', percent: 85 }, { name: 'b', percent: null }, { name: 'c', percent: 20 }])).toBe(105);
  });

  it('classifies single-varietal and cuvée', () => {
    expect(classify(0)).toBeNull();
    expect(classify(1)).toBe('Rebsortenrein');
    expect(classify(2)).toBe('Cuvée');
  });

  it('matches names case-insensitively and lists unknown ones', () => {
    const entries = [{ name: 'cabernet sauvignon ', percent: 85 }, { name: 'Petit Verdot', percent: null }];
    expect(hasEntry(entries, 'Cabernet Sauvignon')).toBe(true);
    expect(unknownNames(entries, varieties)).toEqual(['Petit Verdot']);
  });

  it('builds requests in entry order', () => {
    const entries = [{ name: 'Cabernet Franc', percent: 15 }, { name: 'Cabernet Sauvignon', percent: 85 }];
    expect(toRequests(entries, varieties)).toEqual([
      { grapeId: 'cf', percent: 15 },
      { grapeId: 'cs', percent: 85 },
    ]);
  });
});
