import {
  assess,
  axisRange,
  axisTicks,
  curveFromWindow,
  curveOf,
  curvePaths,
  inRange,
  level,
  xOf,
} from './drinking-curve.logic';

const curve = (peak: number, spread: number) => ({ peak, spread, derived: false });

describe('drinking curve', () => {
  it('is 100 % at the peak and falls off symmetrically', () => {
    const c = curve(2031, 3);
    expect(level(c, 2031)).toBe(1);
    expect(level(c, 2028)).toBeCloseTo(level(c, 2034));
    expect(level(c, 2034)).toBeCloseTo(Math.exp(-0.5));
  });

  it('is wider for a larger spread', () => {
    expect(level(curve(2031, 5), 2036)).toBeGreaterThan(level(curve(2031, 1), 2036));
  });

  it('derives middle and a quarter of the width from a window', () => {
    expect(curveFromWindow(2024, 2032)).toEqual({ peak: 2028, spread: 2, derived: true });
    expect(curveFromWindow(2026, 2034).peak).toBe(2030);
    expect(curveFromWindow(2026, 2026).spread).toBe(0.5);
  });

  it('prefers the stored curve, falls back to the window, else nothing', () => {
    expect(curveOf({ drinkPeak: 2031, drinkSpread: 3, drinkFrom: 2020, drinkUntil: 2040 })).toEqual(curve(2031, 3));
    expect(curveOf({ drinkPeak: null, drinkSpread: null, drinkFrom: 2024, drinkUntil: 2032 })?.derived).toBe(true);
    expect(curveOf({ drinkFrom: 2024, drinkUntil: null })).toBeNull();
    expect(curveOf({})).toBeNull();
  });

  describe('assessment', () => {
    it('too young before the peak', () => {
      expect(assess(curve(2035, 2), 2026).label).toBe('Noch zu jung – Höhepunkt 2035');
      expect(assess(curve(2035, 2), 2026).state).toBe('early');
    });
    it('near the peak', () => {
      expect(assess(curve(2027, 3), 2026).label).toBe('Nahe am Höhepunkt');
      expect(assess(curve(2027, 3), 2026).state).toBe('peak');
    });
    it('past the peak', () => {
      expect(assess(curve(2015, 2), 2026).label).toBe('Über den Höhepunkt hinaus');
      expect(assess(curve(2015, 2), 2026).state).toBe('late');
    });
  });

  describe('axis', () => {
    it('covers peak ± 3 spreads and the current year', () => {
      const r = axisRange(curve(2031, 3), 2026);
      expect(r.from).toBeLessThanOrEqual(2022);
      expect(r.to).toBeGreaterThanOrEqual(2040);
      expect(inRange(2026, r)).toBe(true);
    });
    it('is at most 40 years wide and keeps a minimum', () => {
      const wide = axisRange(curve(2040, 30), 2026);
      expect(wide.to - wide.from).toBeLessThanOrEqual(40);
      const narrow = axisRange(curve(2031, 0.5), 2031);
      expect(narrow.to - narrow.from).toBeGreaterThanOrEqual(6);
    });
    it('has at most 8 round ticks', () => {
      const ticks = axisTicks({ from: 2012, to: 2050 });
      expect(ticks.length).toBeLessThanOrEqual(8);
      expect(ticks.every((t) => t % 5 === 0)).toBe(true);
    });
  });

  it('draws the peak at the top and in the middle', () => {
    const range = { from: 2021, to: 2041 };
    const paths = curvePaths(curve(2031, 3), range, 200, 100);
    expect(paths.line.startsWith('M0 ')).toBe(true);
    expect(paths.line).toContain('100 0'); // x = middle, y = top
    expect(paths.area.endsWith('Z')).toBe(true);
    expect(xOf(2031, range, 200)).toBe(100);
  });
});
