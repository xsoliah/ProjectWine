import { describe, expect, it } from 'vitest';
import { BOTTLE_LENGTH, labelFrame, standardShape, wallPoints } from '../core/bottle';
import {
  CAGE_RING,
  CORK_BOTTOM,
  FOIL_END,
  PLATE_HEIGHT,
  hasSparklingModel,
  sparklingGlassPoints,
  sparklingParts,
} from './sparkling-bottle';

const shape = standardShape('Sparkling', 'Champagne');

function box(geometry: { boundingBox: { min: { y: number }; max: { y: number } } | null; computeBoundingBox(): void }) {
  geometry.computeBoundingBox();
  return geometry.boundingBox!;
}

describe('sparkling bottle model', () => {
  it('is used for the Champagne form only', () => {
    expect(hasSparklingModel('Champagne')).toBe(true);
    expect(['Bordeaux', 'Burgundy', 'Flute'].some((form) => hasSparklingModel(form as 'Bordeaux'))).toBe(false);
  });

  it('has a punt: the glass starts in a dent above the base and closes on the axis', () => {
    const points = sparklingGlassPoints(wallPoints(shape, BOTTLE_LENGTH), BOTTLE_LENGTH);
    expect(points[0][0]).toBe(0);
    expect(points[0][1]).toBeGreaterThan(0.1);
    // The dent rises towards the middle, the standing ring is the lowest point.
    expect(Math.min(...points.map(([, y]) => y))).toBe(0);
    expect(points[points.length - 1][0]).toBe(0);
  });

  it('keeps the standard wall of the form after the punt', () => {
    const wall = wallPoints(shape, BOTTLE_LENGTH);
    const points = sparklingGlassPoints(wall, BOTTLE_LENGTH);
    expect(points.slice(4, 4 + wall.length)).toEqual(wall);
  });

  it('puts foil, cage and cork on the neck in that order', () => {
    const parts = sparklingParts(shape, BOTTLE_LENGTH);
    const half = BOTTLE_LENGTH / 2;
    const foil = box(parts.foil);
    expect(foil.max.y).toBeCloseTo(FOIL_END * BOTTLE_LENGTH - half, 1);
    const wire = box(parts.wire);
    expect(wire.min.y).toBeLessThan(CAGE_RING * BOTTLE_LENGTH - half);
    expect(wire.max.y).toBeGreaterThan(PLATE_HEIGHT * BOTTLE_LENGTH - half);
    const cork = box(parts.cork);
    expect(cork.min.y).toBeCloseTo(CORK_BOTTOM * BOTTLE_LENGTH - half, 3);
    expect(cork.max.y).toBeGreaterThan(BOTTLE_LENGTH / 2);
  });

  it('keeps the foil and the cage away from the label', () => {
    const labelTop = labelFrame(shape, BOTTLE_LENGTH).top - BOTTLE_LENGTH / 2;
    const parts = sparklingParts(shape, BOTTLE_LENGTH);
    expect(box(parts.foil).min.y).toBeGreaterThan(labelTop);
    expect(box(parts.wire).min.y).toBeGreaterThan(labelTop);
  });
});
