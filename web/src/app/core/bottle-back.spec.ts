import { describe, expect, it } from 'vitest';
import { BOTTLE_LENGTH, backLabelFrame, labelFrame, radiusAt, standardShape } from './bottle';

describe('back label', () => {
  const shape = standardShape('Red');
  const length = BOTTLE_LENGTH;
  const radius = radiusAt(shape, (shape.label.top + shape.label.bottom) / 2) * length;

  it('sits opposite the front label at its height, keeping the photo proportions', () => {
    const front = labelFrame(shape, length);
    const back = backLabelFrame(shape, length, 0.75)!;
    expect((back.startAngle + back.endAngle) / 2).toBeCloseTo(shape.label.centerAngle + Math.PI, 6);
    expect((back.bottom + back.top) / 2).toBeCloseTo((front.bottom + front.top) / 2, 6);
    expect((back.arc * radius) / (back.top - back.bottom)).toBeCloseTo(0.75, 3);
  });

  it('shrinks a wide photo to the space between the labels without distortion', () => {
    const front = labelFrame(shape, length);
    const back = backLabelFrame(shape, length, 6)!;
    expect(back.arc).toBeLessThanOrEqual(2 * Math.PI - front.arc);
    expect(back.top - back.bottom).toBeLessThan(front.height);
    expect((back.arc * radius) / (back.top - back.bottom)).toBeCloseTo(6, 3);
  });

  it('does not overlap the front label', () => {
    const front = labelFrame(shape, length);
    const back = backLabelFrame(shape, length, 6)!;
    expect(back.startAngle).toBeGreaterThanOrEqual(front.endAngle);
    expect(back.endAngle).toBeLessThanOrEqual(front.startAngle + 2 * Math.PI);
  });

  it('has no room when the front label wraps almost all the way round, or the photo is unusable', () => {
    const wrapped = { ...shape, label: { ...shape.label, widthFraction: 3 } };
    expect(backLabelFrame(wrapped, length, 0.75)).toBeNull();
    expect(backLabelFrame(shape, length, 0)).toBeNull();
  });
});
