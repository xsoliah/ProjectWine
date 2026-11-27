import { Wine } from './models';

/** Drinking curve: a bell curve (normal distribution) around the best drinking year. */
export interface Curve {
  /** Best drinking year. */
  peak: number;
  /** Standard deviation in years: the wider, the longer the wine tastes good around its peak. */
  spread: number;
  /** Derived from the drinking window instead of stored. */
  derived: boolean;
}

export type CurveState = 'early' | 'peak' | 'late';

export interface CurveAssessment {
  state: CurveState;
  /** Curve height this year, 0..1. */
  level: number;
  label: string;
}

export const MIN_SPREAD = 0.5;
/** From this curve height on a wine counts as "near its peak". */
export const PEAK_LEVEL = 0.8;
const MAX_SPAN = 40;
const MIN_SPAN = 6;

/** Peak in the middle of the window, spread a quarter of its width (at least 0.5). Mirrors the server. */
export function curveFromWindow(from: number, until: number): Curve {
  return {
    peak: Math.round((from + until) / 2),
    spread: Math.max(MIN_SPREAD, Math.round(((until - from) / 4) * 100) / 100),
    derived: true,
  };
}

/** The stored curve, else one derived from a complete drinking window, else null. */
export function curveOf(
  wine: Partial<Pick<Wine, 'drinkPeak' | 'drinkSpread' | 'drinkFrom' | 'drinkUntil'>>,
): Curve | null {
  const { drinkPeak: peak, drinkSpread: spread, drinkFrom: from, drinkUntil: until } = wine;
  if (peak != null && spread != null && spread > 0) return { peak, spread, derived: false };
  if (from != null && until != null && until >= from) return curveFromWindow(from, until);
  return null;
}

/** Height of the curve in the given year: 1 at the peak, falling off with the spread. */
export function level(curve: Curve, year: number): number {
  const d = (year - curve.peak) / curve.spread;
  return Math.exp(-(d * d) / 2);
}

/** Where the wine stands this year, in words. */
export function assess(curve: Curve, year: number): CurveAssessment {
  const value = level(curve, year);
  if (value >= PEAK_LEVEL) return { state: 'peak', level: value, label: 'Nahe am Höhepunkt' };
  if (year < curve.peak) {
    return { state: 'early', level: value, label: `Noch zu jung – Höhepunkt ${curve.peak}` };
  }
  return { state: 'late', level: value, label: 'Über den Höhepunkt hinaus' };
}

/** Years shown on the axis: peak ± 3 spreads, widened to include this year, at most 40 years around the peak. */
export function axisRange(curve: Curve, year: number): { from: number; to: number } {
  let from = Math.floor(Math.min(curve.peak - 3 * curve.spread, year - 1));
  let to = Math.ceil(Math.max(curve.peak + 3 * curve.spread, year + 1));
  from = Math.max(from, curve.peak - MAX_SPAN / 2);
  to = Math.min(to, curve.peak + MAX_SPAN / 2);
  if (to - from < MIN_SPAN) {
    from = curve.peak - MIN_SPAN / 2;
    to = curve.peak + MIN_SPAN / 2;
  }
  return { from, to };
}

/** Year labels for the axis: a round step so that there are at most 8. */
export function axisTicks(range: { from: number; to: number }): number[] {
  const span = range.to - range.from;
  const step = [1, 2, 5, 10].find((s) => span / s <= 8) ?? 10;
  const ticks: number[] = [];
  for (let t = Math.ceil(range.from / step) * step; t <= range.to; t += step) ticks.push(t);
  return ticks;
}

export interface CurvePaths {
  /** Open line along the curve. */
  line: string;
  /** Closed shape down to the baseline (for the filled area). */
  area: string;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** SVG paths of the curve in a box of the given size (x from the left, y from the top, curve height 1 = top). */
export function curvePaths(
  curve: Curve,
  range: { from: number; to: number },
  width: number,
  height: number,
  steps = 96,
): CurvePaths {
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const year = range.from + ((range.to - range.from) * i) / steps;
    points.push(`${round(xOf(year, range, width))} ${round(height - level(curve, year) * height)}`);
  }
  const line = `M${points.join(' L')}`;
  return { line, area: `${line} L${round(width)} ${height} L0 ${height} Z` };
}

/** Horizontal position of a year in the box, or null when it lies outside the range. */
export function xOf(year: number, range: { from: number; to: number }, width: number): number {
  return ((year - range.from) / (range.to - range.from)) * width;
}

export function inRange(year: number, range: { from: number; to: number }): boolean {
  return year >= range.from && year <= range.to;
}

/** Text alternative of the chart for screen readers. */
export function curveSummary(curve: Curve, assessment: CurveAssessment): string {
  const how = curve.spread >= 4 ? 'breites' : curve.spread <= 1.5 ? 'enges' : 'mittleres';
  return `Geschätzter Höhepunkt ${curve.peak}, ${how} Genussfenster (Streuung ${curve.spread} Jahre). ${assessment.label}.`;
}
