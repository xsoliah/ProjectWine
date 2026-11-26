import { Statistics, StatisticsSegment } from '../../core/models';
import { toLegend } from './overview.logic';

const seg = (key: string, label: string, bottles: number, extra: Partial<StatisticsSegment> = {}): StatisticsSegment => ({
  key, label, bottles, percent: 0, isUnknown: false, children: null, ...extra,
});

const stats = (groupBy: Statistics['groupBy'], segments: StatisticsSegment[], country: Statistics['country'] = null): Statistics => ({
  totals: { bottles: 0, wines: 0, totalValue: 0, winesWithoutPrice: 0 },
  groupBy, country, segments,
});

describe('overview legend', () => {
  it('uses German labels and the app colors for wine types', () => {
    const legend = toLegend(stats('Type', [seg('Red', 'Red', 6), seg('White', 'White', 3)]));
    expect(legend.map((l) => l.label)).toEqual(['Rotwein', 'Weißwein']);
    expect(legend[0].color).toBe('var(--t-red)');
  });

  it('assigns categorical slots in order and keeps "Ohne Angabe" and "Sonstige" neutral', () => {
    const legend = toLegend(stats('Country', [
      seg('a', 'Italien', 5),
      seg('other', 'Sonstige', 3, { children: [seg('c', 'Spanien', 3)] }),
      seg('b', 'Österreich', 2),
      seg('none', 'Ohne Angabe', 1, { isUnknown: true }),
    ]));
    expect(legend.map((l) => l.color)).toEqual([
      'var(--chart-1)', 'var(--chart-muted)', 'var(--chart-2)', 'var(--chart-muted)',
    ]);
    expect(legend[1].children?.[0].label).toBe('Spanien');
  });

  it('keeps "Ohne Region (Land)" as its own colored group, but neutral in the drill-down', () => {
    const flat = toLegend(stats('Region', [seg('none:it', 'Ohne Region (Italien)', 2, { isUnknown: true })]));
    expect(flat[0].color).toBe('var(--chart-1)');
    const drill = toLegend(stats('Region', [seg('none:it', 'Ohne Region', 2, { isUnknown: true })], { id: 'it', name: 'Italien' }));
    expect(drill[0].color).toBe('var(--chart-muted)');
  });

  it('colors "Cuvée" like any grape and keeps "Ohne Angabe" neutral', () => {
    const legend = toLegend(stats('Grape', [
      seg('riesling', 'Riesling', 5),
      seg('cuvee', 'Cuvée', 4),
      seg('none', 'Ohne Angabe', 1, { isUnknown: true }),
    ]));
    expect(legend.map((l) => l.color)).toEqual(['var(--chart-1)', 'var(--chart-2)', 'var(--chart-muted)']);
  });
});
