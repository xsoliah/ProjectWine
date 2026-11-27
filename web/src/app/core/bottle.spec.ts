import { describe, expect, it } from 'vitest';
import {
  BOTTLE_LENGTH,
  LABEL_IMAGE_ASPECT,
  MAX_AZIMUTH,
  MAX_LABEL_ARC,
  MAX_RACK_SCALE,
  MAX_TILT,
  bottleScale,
  capsuleDimensions,
  effectiveShape,
  labelArc,
  labelFrame,
  labelUvCrop,
  lathePoints,
  moveLabel,
  outlineValid,
  placementValid,
  rackBottleScale,
  radiusAt,
  resolveForm,
  standardShape,
  stepView,
  templateOutline,
  wallPoints,
} from './bottle';
import { BottleShape } from './models';

describe('standard bottle', () => {
  it('is the Bordeaux bottle of the rack, closed on the axis', () => {
    const points = lathePoints(wallPoints(standardShape('Red'), BOTTLE_LENGTH));
    expect(points[0]).toEqual([0, 0]);
    expect(points[points.length - 1][1]).toBeCloseTo(BOTTLE_LENGTH, 3);
    expect(Math.max(...points.map((p) => p[0]))).toBeCloseTo(0.36, 2);
  });

  it('makes sparkling wine stockier', () => {
    const red = Math.max(...standardShape('Red').profile.map((p) => p.radius));
    const sparkling = Math.max(...standardShape('Sparkling').profile.map((p) => p.radius));
    expect(sparkling).toBeGreaterThan(red);
  });

  it('is used when a wine has no measured shape', () => {
    expect(effectiveShape(null, 'White').profile.length).toBeGreaterThan(8);
    const own: BottleShape = { ...standardShape('Red'), label: { top: 0.6, bottom: 0.3, widthFraction: 0.5, centerAngle: 0.2 } };
    expect(effectiveShape(own, 'White')).toBe(own);
  });
});

describe('label on the bottle', () => {
  const shape = (label: Partial<BottleShape['label']>): BottleShape => {
    const base = standardShape('Red');
    return { ...base, label: { ...base.label, ...label } };
  };

  it('covers twice the width share as an angle', () => {
    expect(labelArc({ top: 0.5, bottom: 0.2, widthFraction: 0.5, centerAngle: 0 })).toBeCloseTo(1, 5);
  });

  it('is limited to the circumference', () => {
    expect(labelArc({ top: 0.5, bottom: 0.2, widthFraction: Math.PI, centerAngle: 0 })).toBe(MAX_LABEL_ARC);
    expect(MAX_LABEL_ARC).toBeLessThan(2 * Math.PI);
  });

  it('sits at the height and angle of the shape', () => {
    const frame = labelFrame(shape({ top: 0.5, bottom: 0.155, widthFraction: 0.4, centerAngle: 0.5 }), BOTTLE_LENGTH);
    expect(frame.bottom).toBeCloseTo(0.155 * BOTTLE_LENGTH, 5);
    expect(frame.top).toBeCloseTo(0.5 * BOTTLE_LENGTH, 5);
    expect(frame.height).toBeCloseTo(0.345 * BOTTLE_LENGTH, 5);
    expect(frame.startAngle).toBeCloseTo(0.5 - 0.4, 5);
    expect(frame.endAngle).toBeCloseTo(0.5 + 0.4, 5);
  });

  it('is narrow for a narrow label and wide for a wide one', () => {
    const narrow = labelFrame(shape({ widthFraction: 0.2 }), BOTTLE_LENGTH);
    const wide = labelFrame(shape({ widthFraction: 2 }), BOTTLE_LENGTH);
    expect(narrow.arc).toBeLessThan(wide.arc);
    expect(narrow.aspect).toBeLessThan(wide.aspect);
  });

  it('keeps off-centre labels off-centre', () => {
    const frame = labelFrame(shape({ centerAngle: -0.8, widthFraction: 0.3 }), BOTTLE_LENGTH);
    expect((frame.startAngle + frame.endAngle) / 2).toBeCloseTo(-0.8, 5);
  });

  it('follows the wall radius at the label height', () => {
    expect(radiusAt(standardShape('Red'), 0.3)).toBeCloseTo(0.36 / BOTTLE_LENGTH, 3);
    expect(radiusAt(standardShape('Red'), 0.9)).toBeCloseTo(0.12 / BOTTLE_LENGTH, 3);
  });
});

describe('label texture crop', () => {
  it('uses the whole image for labels near 3:4', () => {
    expect(labelUvCrop(LABEL_IMAGE_ASPECT)).toEqual({ u0: 0, v0: 0, du: 1, dv: 1 });
    expect(labelUvCrop(LABEL_IMAGE_ASPECT * 1.02)).toEqual({ u0: 0, v0: 0, du: 1, dv: 1 });
  });

  it('cuts the paper bars off a wide label (top and bottom)', () => {
    const crop = labelUvCrop(1.5);
    expect(crop.du).toBe(1);
    expect(crop.dv).toBeCloseTo(0.5, 5);
    expect(crop.v0).toBeCloseTo(0.25, 5);
  });

  it('cuts the paper bars off a narrow label (left and right)', () => {
    const crop = labelUvCrop(0.375);
    expect(crop.dv).toBe(1);
    expect(crop.du).toBeCloseTo(0.5, 5);
    expect(crop.u0).toBeCloseTo(0.25, 5);
  });
});

describe('view rotation', () => {
  it('turns with the arrow keys and stays within the limits', () => {
    let view = { azimuth: 0, tilt: 0 };
    const right = stepView(view, 'ArrowRight')!;
    expect(right.azimuth).toBeGreaterThan(0);
    for (let i = 0; i < 100; i++) view = stepView(view, 'ArrowRight')!;
    expect(view.azimuth).toBe(MAX_AZIMUTH);
    for (let i = 0; i < 100; i++) view = stepView(view, 'ArrowUp')!;
    expect(view.tilt).toBe(MAX_TILT);
  });

  it('turns past the front limits when the azimuth range is unlimited', () => {
    let view = { azimuth: 0, tilt: 0 };
    for (let i = 0; i < 40; i++) view = stepView(view, 'ArrowRight', false, Infinity)!;
    expect(view.azimuth).toBeGreaterThan(Math.PI);
  });

  it('ignores other keys', () => {
    expect(stepView({ azimuth: 0, tilt: 0 }, 'a')).toBeNull();
  });
});

describe('placement', () => {
  it('accepts the standard label and rejects labels off the bottle', () => {
    expect(placementValid(standardShape('Red').label)).toBe(true);
    expect(placementValid({ top: 1.2, bottom: 0.5, widthFraction: 0.5, centerAngle: 0 })).toBe(false);
    expect(placementValid({ top: 0.5, bottom: 0.49, widthFraction: 0.5, centerAngle: 0 })).toBe(false);
    expect(placementValid({ top: 0.5, bottom: 0.2, widthFraction: 4, centerAngle: 0 })).toBe(false);
  });

  it('moves the label without leaving the bottle or changing its height', () => {
    const moved = moveLabel({ top: 0.5, bottom: 0.2, widthFraction: 0.5, centerAngle: 0 }, 0.9);
    expect(moved.top).toBeCloseTo(1, 5);
    expect(moved.top - moved.bottom).toBeCloseTo(0.3, 5);
  });
});

describe('outline template', () => {
  const outline = templateOutline(standardShape('Red'), 800 / 1200);

  it('stands upright in the middle of the photo, base first', () => {
    expect(outline.length).toBe(standardShape('Red').profile.length * 2);
    expect(outline[0].y).toBeCloseTo(0.95, 5);
    expect(Math.min(...outline.map((p) => p.y))).toBeCloseTo(0.05, 2);
    const xs = outline.map((p) => p.x);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(0.5, 5);
  });

  it('is a valid outline, and implausible ones are not', () => {
    expect(outlineValid(outline)).toBe(true);
    expect(outlineValid(outline.slice(0, 3))).toBe(false);
    expect(outlineValid(outline.map((p) => ({ ...p, x: p.x + 1 })))).toBe(false);
    expect(outlineValid(outline.map(() => ({ x: 0.5, y: 0.5 })))).toBe(false);
  });
});

describe('bottle size', () => {
  it('scales with the cube root of the volume within limits', () => {
    expect(bottleScale(750)).toBe(1);
    expect(bottleScale(1500)).toBeCloseTo(1.26, 2);
    expect(bottleScale(50)).toBe(0.6);
    expect(bottleScale(30000)).toBe(1.6);
    expect(bottleScale(null)).toBe(1);
  });
});

describe('bottle forms', () => {
  const forms = ['Bordeaux', 'Burgundy', 'Champagne', 'Flute'] as const;
  const maxRadius = (form: (typeof forms)[number]) => Math.max(...standardShape('Red', form).profile.map((p) => p.radius));

  it('follows the wine type unless a form is chosen', () => {
    expect(resolveForm(null, 'Sparkling')).toBe('Champagne');
    expect(resolveForm(undefined, 'Red')).toBe('Bordeaux');
    expect(resolveForm('Burgundy', 'Sparkling')).toBe('Burgundy');
    expect(standardShape('Sparkling').profile).toEqual(standardShape('Red', 'Champagne').profile);
  });

  it('gives every form its own, valid profile (radius within the server limit, from base to mouth)', () => {
    const signatures = new Set<string>();
    for (const form of forms) {
      const { profile } = standardShape('Red', form);
      expect(profile[0].height).toBe(0);
      expect(profile[profile.length - 1].height).toBeCloseTo(1, 3);
      expect(maxRadius(form)).toBeLessThanOrEqual(0.35);
      signatures.add(profile.map((p) => p.radius).join(','));
    }
    expect(signatures.size).toBe(forms.length);
    expect(maxRadius('Flute')).toBeLessThan(maxRadius('Bordeaux'));
    expect(maxRadius('Champagne')).toBeGreaterThan(maxRadius('Bordeaux'));
  });

  it('covers more of the neck with foil on sparkling wine bottles', () => {
    const length = (form: (typeof forms)[number]) => {
      const c = capsuleDimensions(standardShape('Red', form), form);
      return c.top - c.start;
    };
    expect(length('Champagne')).toBeGreaterThan(length('Bordeaux') * 1.2);
  });

  it('keeps a measured shape and only uses the form for the fallback', () => {
    const own: BottleShape = { ...standardShape('Red'), label: { top: 0.6, bottom: 0.3, widthFraction: 0.5, centerAngle: 0.2 } };
    expect(effectiveShape(own, 'Sparkling', 'Champagne')).toBe(own);
    expect(effectiveShape(null, 'Red', 'Flute').profile).toEqual(standardShape('Red', 'Flute').profile);
  });
});

describe('bottle size in the rack', () => {
  it('makes a half bottle smaller and a magnum larger, within the slot', () => {
    expect(rackBottleScale(375)).toBeLessThan(rackBottleScale(750));
    expect(rackBottleScale(750)).toBe(1);
    expect(rackBottleScale(1500)).toBeGreaterThan(1);
    expect(rackBottleScale(30000)).toBe(MAX_RACK_SCALE);
    expect(rackBottleScale(undefined)).toBe(1);
  });
});
