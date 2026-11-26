import { computeArcs, ringPath } from './donut-chart.logic';

describe('donut chart logic', () => {
  it('splits the full circle proportionally', () => {
    const arcs = computeArcs([6, 3, 1]);
    const sweeps = arcs.map((a) => a.end - a.start);
    expect(sweeps.reduce((a, b) => a + b, 0)).toBeCloseTo(Math.PI * 2);
    expect(sweeps[0]).toBeCloseTo(Math.PI * 2 * 0.6);
    expect(arcs[1].start).toBeCloseTo(arcs[0].end);
  });

  it('gives a single segment the full circle', () => {
    const [arc] = computeArcs([5]);
    expect(arc.end - arc.start).toBeCloseTo(Math.PI * 2);
    // drawn as two halves, each a closed sub-path
    expect(ringPath(arc, 50, 32).match(/Z/g)?.length).toBe(2);
  });

  it('draws nothing for empty values', () => {
    const arcs = computeArcs([0, 0]);
    expect(arcs.every((a) => a.end === a.start)).toBe(true);
    expect(ringPath(arcs[0], 50, 32)).toBe('');
  });

  it('uses the large-arc flag only for segments over half the circle', () => {
    const [big, small] = computeArcs([3, 1]);
    expect(ringPath(big, 50, 32)).toContain('A 50 50 0 1 1');
    expect(ringPath(small, 50, 32)).toContain('A 50 50 0 0 1');
  });
});
