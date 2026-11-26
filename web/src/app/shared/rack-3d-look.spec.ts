import { WineType } from '../core/models';
import {
  CAPSULE_BY_TYPE,
  GLASS_BY_TYPE,
  LabelAtlas,
  PULL_DISTANCE,
  PULL_PITCH,
  PULL_ROLL,
  TILE_COUNT,
  slidePose,
} from './rack-3d-look';

const TYPES: WineType[] = ['Red', 'White', 'Rose', 'Sparkling', 'Dessert', 'Fortified', 'Other'];

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

describe('glass palette', () => {
  it('has a glass and capsule color for every wine type', () => {
    for (const type of TYPES) {
      expect(GLASS_BY_TYPE[type]).toMatch(/^#[0-9a-f]{6}$/);
      expect(CAPSULE_BY_TYPE[type]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('is natural: no glass is bright red or fully saturated', () => {
    for (const type of TYPES) {
      const [r, g, b] = channels(GLASS_BY_TYPE[type]);
      const max = Math.max(r, g, b);
      const saturation = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
      if (type !== 'White' && type !== 'Rose') expect(max).toBeLessThanOrEqual(0xc8);
      expect(saturation).toBeLessThan(0.8);
      expect(r > 0x60 && g * 2 < r && b * 2 < r).toBe(false); // no bright red; amber is fine
    }
  });

  it('makes white wine glass light, barely saturated and greener than yellow', () => {
    const [r, g, b] = channels(GLASS_BY_TYPE.White);
    const max = Math.max(r, g, b);
    expect(max).toBeGreaterThanOrEqual(0xd0);
    expect((max - Math.min(r, g, b)) / max).toBeLessThan(0.15);
    expect(g).toBeGreaterThanOrEqual(r);
  });

  it('keeps rose pinkish and dessert wine amber, both distinct from white', () => {
    const [r, g] = channels(GLASS_BY_TYPE.Rose);
    expect(r).toBeGreaterThan(g);
    const [dr, , db] = channels(GLASS_BY_TYPE.Dessert);
    expect(dr).toBeGreaterThan(db * 2);
  });

  it('makes red wine glass very dark', () => {
    const [r, g, b] = channels(GLASS_BY_TYPE.Red);
    expect(Math.max(r, g, b)).toBeLessThan(0x30);
  });
});

describe('LabelAtlas', () => {
  it('maps no image to the neutral tile 0', () => {
    const atlas = new LabelAtlas();
    expect(atlas.assign(null)).toEqual({ tile: 0, isNew: false });
    expect(atlas.assign(undefined)).toEqual({ tile: 0, isNew: false });
  });

  it('gives the same image the same tile and marks it new only once', () => {
    const atlas = new LabelAtlas();
    const first = atlas.assign('a');
    expect(first.tile).toBeGreaterThan(0);
    expect(first.isNew).toBe(true);
    expect(atlas.assign('a')).toEqual({ tile: first.tile, isNew: false });
    expect(atlas.assign('b').tile).not.toBe(first.tile);
  });

  it('falls back to tile 0 when there are more images than tiles', () => {
    const atlas = new LabelAtlas();
    for (let i = 1; i < TILE_COUNT; i++) expect(atlas.assign(`img${i}`).tile).toBe(i);
    expect(atlas.assign('overflow')).toEqual({ tile: 0, isNew: false });
  });

  it('keeps tile rectangles inside the atlas without overlap', () => {
    const seen = new Set<string>();
    for (let tile = 0; tile < TILE_COUNT; tile++) {
      const r = LabelAtlas.rect(tile);
      expect(r.x + r.width).toBeLessThanOrEqual(2048);
      expect(r.y + r.height).toBeLessThanOrEqual(2048);
      seen.add(`${r.x},${r.y}`);
    }
    expect(seen.size).toBe(TILE_COUNT);
  });
});

describe('slidePose', () => {
  it('rests in the shelf at 0 and is fully out at 1', () => {
    expect(slidePose(0)).toEqual({ z: 0, roll: 0, pitch: 0 });
    const out = slidePose(1);
    expect(out.z).toBeCloseTo(PULL_DISTANCE);
    expect(out.roll).toBeCloseTo(Math.PI);
    expect(out.pitch).toBeCloseTo(Math.PI / 2);
    expect(PULL_ROLL).toBeCloseTo(Math.PI);
    expect(PULL_PITCH).toBeCloseTo(Math.PI / 2);
  });

  it('stands up only after the bottle has mostly slid out', () => {
    expect(slidePose(0.3).pitch).toBe(0);
    expect(slidePose(0.3).z).toBeGreaterThan(PULL_DISTANCE / 2);
  });

  it('moves monotonically and clamps out-of-range progress', () => {
    let previous = slidePose(0);
    for (let i = 1; i <= 20; i++) {
      const pose = slidePose(i / 20);
      expect(pose.z).toBeGreaterThanOrEqual(previous.z);
      expect(pose.roll).toBeGreaterThanOrEqual(previous.roll);
      expect(pose.pitch).toBeGreaterThanOrEqual(previous.pitch);
      previous = pose;
    }
    expect(slidePose(-1)).toEqual(slidePose(0));
    expect(slidePose(2)).toEqual(slidePose(1));
  });
});
