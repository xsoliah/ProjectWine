export interface Arc {
  /** Start angle in radians, 0 = 12 o'clock, clockwise. */
  start: number;
  end: number;
}

const FULL = Math.PI * 2;

/** Splits the full circle proportionally to the values (in order). Zero/negative values get no arc. */
export function computeArcs(values: readonly number[]): Arc[] {
  const total = values.reduce((sum, v) => sum + Math.max(0, v), 0);
  let angle = 0;
  return values.map((value) => {
    const sweep = total > 0 ? (Math.max(0, value) / total) * FULL : 0;
    const arc = { start: angle, end: angle + sweep };
    angle += sweep;
    return arc;
  });
}

function point(cx: number, cy: number, radius: number, angle: number): string {
  const x = cx + radius * Math.sin(angle);
  const y = cy - radius * Math.cos(angle);
  return `${round(x)} ${round(y)}`;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * SVG path of a ring segment between two radii. A (nearly) full circle is drawn as two halves,
 * because a single SVG arc cannot start and end at the same point.
 */
export function ringPath(arc: Arc, outer: number, inner: number, cx = 50, cy = 50): string {
  const sweep = arc.end - arc.start;
  if (sweep <= 0) return '';
  if (sweep >= FULL - 1e-6) {
    const half = { start: arc.start, end: arc.start + Math.PI };
    const rest = { start: arc.start + Math.PI, end: arc.start + FULL - 1e-6 };
    return `${ringPath(half, outer, inner, cx, cy)} ${ringPath(rest, outer, inner, cx, cy)}`;
  }
  const large = sweep > Math.PI ? 1 : 0;
  return [
    `M ${point(cx, cy, outer, arc.start)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${point(cx, cy, outer, arc.end)}`,
    `L ${point(cx, cy, inner, arc.end)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${point(cx, cy, inner, arc.start)}`,
    'Z',
  ].join(' ');
}
