import { Country } from './models';
import { findCountry, findRegion, formatOrigin, normalizeOrigin } from './origins';

const italy: Country = {
  id: 'it', name: 'Italien', wineCount: 0,
  regions: [{ id: 'tos', name: 'Toskana', wineCount: 0 }],
};
const austria: Country = { id: 'at', name: 'Österreich', wineCount: 0, regions: [] };

describe('origins', () => {
  it('normalizes trimmed and case-insensitive', () => {
    expect(normalizeOrigin('  österreich ')).toBe(normalizeOrigin('Österreich'));
  });

  it('finds countries and regions by name', () => {
    expect(findCountry([italy, austria], ' italien')).toBe(italy);
    expect(findCountry([italy, austria], 'Portugal')).toBeNull();
    expect(findCountry([italy], '')).toBeNull();
    expect(findRegion(italy, 'TOSKANA')?.id).toBe('tos');
    expect(findRegion(austria, 'Toskana')).toBeNull();
    expect(findRegion(null, 'Toskana')).toBeNull();
  });

  it('formats region and country', () => {
    expect(formatOrigin({ name: 'Italien' }, { name: 'Toskana' })).toBe('Toskana, Italien');
    expect(formatOrigin({ name: 'Italien' }, null)).toBe('Italien');
    expect(formatOrigin(null, null)).toBeNull();
  });
});
