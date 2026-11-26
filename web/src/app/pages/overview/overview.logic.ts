import { wineTypeLabel } from '../../core/labels';
import { Statistics, StatisticsSegment, WineType } from '../../core/models';

export interface LegendItem {
  key: string;
  label: string;
  bottles: number;
  percent: number;
  color: string;
  children: LegendItem[] | null;
}

/** Segments that stand for "no value" or "the rest" get the neutral color, never a category hue. */
export function isNeutral(segment: StatisticsSegment, stats: Statistics): boolean {
  const drilled = stats.country !== null || !!stats.drillDown;
  return segment.key === 'other' || segment.key === 'none' || (drilled && segment.isUnknown);
}

/**
 * Wine types keep the app's type colors (the same as on the badges). Everything else takes the
 * categorical slots in fixed order; the API caps the list at 8 entries, so slots never repeat.
 */
export function toLegend(stats: Statistics): LegendItem[] {
  let slot = 0;
  return stats.segments.map((segment) => {
    let color: string;
    if (stats.groupBy === 'Type') {
      color = `var(--t-${segment.key.toLowerCase()})`;
    } else if (isNeutral(segment, stats)) {
      color = 'var(--chart-muted)';
    } else {
      color = `var(--chart-${++slot})`;
    }
    return {
      key: segment.key,
      label: stats.groupBy === 'Type' ? wineTypeLabel(segment.key as WineType) : segment.label,
      bottles: segment.bottles,
      percent: segment.percent,
      color,
      children:
        segment.children?.map((c) => ({ ...c, color, children: null })) ?? null,
    };
  });
}
