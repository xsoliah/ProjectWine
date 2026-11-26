import { BottleLabelPlacement, BottleShape, LabelPoint, WineType } from './models';

/** One rack slot is 1 unit wide; a Bordeaux bottle is about 4 times as long as it is wide. */
export const BOTTLE_LENGTH = 2.9;
export const BOTTLE_RADIUS = 0.36;

/**
 * Outer wall of a Bordeaux bottle as [radius, height] pairs in rack units (from the edge of the base to the lip):
 * straight body, high pronounced shoulders, short neck. The same bottle the server uses as "Standardflasche".
 */
export const STANDARD_WALL: readonly (readonly [number, number])[] = [
  [0.33, 0], [0.36, 0.03], [0.36, 1.85], [0.345, 1.98], [0.29, 2.1], [0.2, 2.19], [0.14, 2.26],
  [0.12, 2.36], [0.12, 2.78], [0.135, 2.8], [0.135, 2.88], [0.1, 2.9],
];

/** Closes a wall profile on the axis (bottom and mouth) so a lathe makes a solid bottle. */
export function lathePoints(wall: readonly (readonly [number, number])[]): [number, number][] {
  const first = wall[0];
  const last = wall[wall.length - 1];
  return [[0, first[1]], ...wall.map(([r, y]) => [r, y] as [number, number]), [0, last[1]]];
}

/** The standard bottle for a wine type (same numbers as the server): sparkling wine is a little stockier. */
export function standardShape(type: WineType | null | undefined): BottleShape {
  const scale = type === 'Sparkling' ? 1.12 : 1;
  return {
    profile: STANDARD_WALL.map(([r, y]) => ({
      height: round(y / BOTTLE_LENGTH),
      radius: round((r / BOTTLE_LENGTH) * scale),
    })),
    label: { top: 0.5, bottom: 0.155, widthFraction: 0.96, centerAngle: 0 },
    outline: null,
    needsReview: false,
  };
}

/** The shape to draw: the measured bottle, otherwise the standard bottle of the wine type. */
export function effectiveShape(shape: BottleShape | null | undefined, type: WineType | null | undefined): BottleShape {
  return shape && shape.profile.length >= 2 ? shape : standardShape(type);
}

/** Wall of a shape as [radius, height] pairs for a bottle of the given length. */
export function wallPoints(shape: BottleShape, length: number): [number, number][] {
  return shape.profile.map((p) => [p.radius * length, p.height * length]);
}

/** Radius of the wall at a height (0..1), as a share of the bottle length; linearly interpolated. */
export function radiusAt(shape: BottleShape, height: number): number {
  const p = shape.profile;
  if (height <= p[0].height) return p[0].radius;
  for (let i = 1; i < p.length; i++) {
    if (height > p[i].height) continue;
    const span = p[i].height - p[i - 1].height;
    const t = span <= 0 ? 0 : (height - p[i - 1].height) / span;
    return p[i - 1].radius + (p[i].radius - p[i - 1].radius) * t;
  }
  return p[p.length - 1].radius;
}

/** The label may not overlap itself: a little less than the full circumference. */
export const MAX_LABEL_ARC = 2 * Math.PI * 0.995;

/** Turn angle (radians) the label covers around the bottle: width share of the diameter times two, limited to the circumference. */
export function labelArc(label: BottleLabelPlacement): number {
  return Math.min(MAX_LABEL_ARC, Math.max(0, 2 * label.widthFraction));
}

export interface LabelFrame {
  /** Heights from the bottom of the bottle (same unit as `length`). */
  bottom: number;
  top: number;
  height: number;
  /** Angle of the left and right edge (0 = facing the viewer, positive = to the right). */
  startAngle: number;
  endAngle: number;
  arc: number;
  /** Real width over the real height of the label, as printed. */
  aspect: number;
}

/** Position and size of the label on a bottle of the given length. */
export function labelFrame(shape: BottleShape, length: number): LabelFrame {
  const { top, bottom, centerAngle } = shape.label;
  const arc = labelArc(shape.label);
  const height = (top - bottom) * length;
  const radius = radiusAt(shape, (top + bottom) / 2) * length;
  return {
    bottom: bottom * length,
    top: top * length,
    height,
    startAngle: centerAngle - arc / 2,
    endAngle: centerAngle + arc / 2,
    arc,
    aspect: height > 0 ? (arc * radius) / height : 0.75,
  };
}

/** The label image is stored at 3:4 with paper-coloured bars when the label has another shape. */
export const LABEL_IMAGE_ASPECT = 900 / 1200;
export const LABEL_FILL_TOLERANCE = 0.03;

export interface UvCrop {
  u0: number;
  v0: number;
  du: number;
  dv: number;
}

/** The part of the stored 3:4 image that holds the label itself (so it keeps its proportions on the bottle). */
export function labelUvCrop(aspect: number): UvCrop {
  if (!(aspect > 0) || Math.abs(aspect - LABEL_IMAGE_ASPECT) / LABEL_IMAGE_ASPECT <= LABEL_FILL_TOLERANCE) {
    return { u0: 0, v0: 0, du: 1, dv: 1 };
  }
  if (aspect > LABEL_IMAGE_ASPECT) {
    const dv = LABEL_IMAGE_ASPECT / aspect;
    return { u0: 0, v0: (1 - dv) / 2, du: 1, dv };
  }
  const du = aspect / LABEL_IMAGE_ASPECT;
  return { u0: (1 - du) / 2, v0: 0, du, dv: 1 };
}

/** Relative size of a bottle in the 3D view: 750 ml = 1, volume to the power of 1/3, within sensible limits. */
export function bottleScale(sizeMl: number | null | undefined): number {
  const ml = sizeMl && sizeMl > 0 ? sizeMl : 750;
  return Math.min(1.6, Math.max(0.6, Math.cbrt(ml / 750)));
}

// ----- View rotation -----

export const MAX_AZIMUTH = (110 * Math.PI) / 180;
export const MAX_TILT = (25 * Math.PI) / 180;
export const KEY_STEP = (12 * Math.PI) / 180;

export interface ViewAngles {
  /** Around the bottle: 0 = looking at the front. */
  azimuth: number;
  /** Up and down: 0 = level. */
  tilt: number;
}

/** Arrow keys turn the bottle in steps, within the allowed range; other keys return null. */
export function stepView(view: ViewAngles, key: string, big = false): ViewAngles | null {
  const step = big ? KEY_STEP * 2 : KEY_STEP;
  const clamp = (v: number, max: number) => Math.min(max, Math.max(-max, v));
  switch (key) {
    case 'ArrowLeft':
      return { ...view, azimuth: clamp(view.azimuth - step, MAX_AZIMUTH) };
    case 'ArrowRight':
      return { ...view, azimuth: clamp(view.azimuth + step, MAX_AZIMUTH) };
    case 'ArrowUp':
      return { ...view, tilt: clamp(view.tilt + step / 2, MAX_TILT) };
    case 'ArrowDown':
      return { ...view, tilt: clamp(view.tilt - step / 2, MAX_TILT) };
    default:
      return null;
  }
}

// ----- Editing the label placement -----

const MIN_LABEL_HEIGHT = 0.04;
const MIN_LABEL_WIDTH = 0.05;
const MAX_LABEL_WIDTH = Math.PI;

/** Same rule as the server: on the bottle, at least 4 % high, width within the circumference, angle within ±π. */
export function placementValid(label: BottleLabelPlacement): boolean {
  return (
    Number.isFinite(label.top) && Number.isFinite(label.bottom) && Number.isFinite(label.widthFraction) &&
    Number.isFinite(label.centerAngle) &&
    label.bottom >= 0 && label.top <= 1 && label.top - label.bottom >= MIN_LABEL_HEIGHT &&
    label.widthFraction >= MIN_LABEL_WIDTH && label.widthFraction <= MAX_LABEL_WIDTH &&
    Math.abs(label.centerAngle) <= Math.PI
  );
}

/** Moves the whole label up or down, keeping its height and staying on the bottle. */
export function moveLabel(label: BottleLabelPlacement, delta: number): BottleLabelPlacement {
  const height = label.top - label.bottom;
  const bottom = Math.min(1 - height, Math.max(0, label.bottom + delta));
  return { ...label, bottom, top: bottom + height };
}

// ----- Outline on the photo -----

/**
 * A starting outline for the editor: the bottle's profile standing upright in the middle of the photo (mouth at 5 %,
 * base at 95 % of the height), from the base up the left side and down the right side. `aspect` is photo width / height.
 */
export function templateOutline(shape: BottleShape, aspect: number): LabelPoint[] {
  const top = 0.05;
  const base = 0.95;
  const span = base - top;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const side = (sign: number): LabelPoint[] =>
    shape.profile.map((p) => ({ x: clamp(0.5 + (sign * p.radius * span) / aspect), y: base - p.height * span }));
  return [...side(-1), ...side(1).reverse()];
}

/** Same rule as the server: at least 6 points, all inside the photo, enclosing some area. */
export function outlineValid(points: readonly LabelPoint[]): boolean {
  if (points.length < 6 || points.length > 100) return false;
  if (points.some((p) => !(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1))) return false;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    area += p.x * q.y - q.x * p.y;
  }
  return Math.abs(area) / 2 >= 0.01;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
