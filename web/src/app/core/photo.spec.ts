import { CENTERED_CORNERS, cornersValid, nudge, targetSize, toNormalized, toScreen } from './photo';

describe('targetSize', () => {
  it('shrinks the long edge to 1568 px and keeps the proportions', () => {
    expect(targetSize(4032, 3024)).toEqual({ width: 1568, height: 1176 });
    expect(targetSize(3024, 4032)).toEqual({ width: 1176, height: 1568 });
  });

  it('never enlarges small photos', () => expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 }));
  it('keeps a photo of exactly 1568 px', () => expect(targetSize(1568, 1000)).toEqual({ width: 1568, height: 1000 }));
});

describe('corner editor coordinates', () => {
  const rect = { left: 100, top: 50, width: 400, height: 300 };

  it('converts a pointer position to normalized coordinates', () =>
    expect(toNormalized(300, 200, rect)).toEqual({ x: 0.5, y: 0.5 }));

  it('clamps positions outside the image to its edge', () =>
    expect(toNormalized(20, 900, rect)).toEqual({ x: 0, y: 1 }));

  it('converts back to screen coordinates', () =>
    expect(toScreen({ x: 0.25, y: 0.5 }, rect)).toEqual({ x: 100, y: 150 }));

  it('moves a point with the keyboard but stays inside the image', () => {
    expect(nudge({ x: 0.5, y: 0.5 }, 0.01, -0.02)).toEqual({ x: 0.51, y: 0.48 });
    expect(nudge({ x: 0.995, y: 0.005 }, 0.01, -0.01)).toEqual({ x: 1, y: 0 });
  });
});

describe('cornersValid', () => {
  it('accepts the centered suggestion', () => expect(cornersValid(CENTERED_CORNERS)).toBe(true));

  it('rejects counter-clockwise, crossed or tiny quadrilaterals', () => {
    expect(cornersValid([{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.9 }, { x: 0.9, y: 0.9 }, { x: 0.9, y: 0.1 }])).toBe(false);
    expect(cornersValid([{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.9, y: 0.1 }, { x: 0.1, y: 0.9 }])).toBe(false);
    expect(cornersValid([{ x: 0.5, y: 0.5 }, { x: 0.55, y: 0.5 }, { x: 0.55, y: 0.55 }, { x: 0.5, y: 0.55 }])).toBe(false);
  });
});
