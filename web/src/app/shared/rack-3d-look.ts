import { WineType } from '../core/models';

/** Natural bottle glass colors (instead of the bright type badge colors). */
export const GLASS_BY_TYPE: Record<WineType, string> = {
  Red: '#101a0c',
  White: '#8a9a52',
  Rose: '#b9c79a',
  Sparkling: '#1f2c17',
  Dessert: '#9a6a24',
  Fortified: '#24170d',
  Other: '#34402f',
};

/** Foil capsule over the neck. */
export const CAPSULE_BY_TYPE: Record<WineType, string> = {
  Red: '#3a1218',
  White: '#b89a52',
  Rose: '#c9a0a0',
  Sparkling: '#c8a24a',
  Dessert: '#8a6a2a',
  Fortified: '#1a1a1a',
  Other: '#3a3a3a',
};

// ----- Label atlas -----

export const ATLAS_SIZE = 2048;
export const TILE_WIDTH = 128;
export const TILE_HEIGHT = 171;
const COLUMNS = Math.floor(ATLAS_SIZE / TILE_WIDTH);
const ROWS = Math.floor(ATLAS_SIZE / TILE_HEIGHT);
/** Tile 0 is the neutral label, the rest belongs to label images. */
export const TILE_COUNT = COLUMNS * ROWS;

export interface TileRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Assigns atlas tiles to label images; tile 0 (neutral label) is used for "no image" and when the atlas is full. */
export class LabelAtlas {
  private readonly tiles = new Map<string, number>();

  /** The tile of an image; `isNew` is true the first time an image gets its tile (it must then be loaded). */
  assign(imageId: string | null | undefined): { tile: number; isNew: boolean } {
    if (!imageId) return { tile: 0, isNew: false };
    const known = this.tiles.get(imageId);
    if (known !== undefined) return { tile: known, isNew: false };
    const next = this.tiles.size + 1;
    if (next >= TILE_COUNT) return { tile: 0, isNew: false };
    this.tiles.set(imageId, next);
    return { tile: next, isNew: true };
  }

  /** Pixel rectangle of a tile (origin top left). */
  static rect(tile: number): TileRect {
    return {
      x: (tile % COLUMNS) * TILE_WIDTH,
      y: Math.floor(tile / COLUMNS) * TILE_HEIGHT,
      width: TILE_WIDTH,
      height: TILE_HEIGHT,
    };
  }

  /** UV rectangle (u0, v0, du, dv) of a tile, inset by half a texel so neighbours do not bleed in. */
  static uvRect(tile: number): [number, number, number, number] {
    const r = LabelAtlas.rect(tile);
    const inset = 0.5;
    const u0 = (r.x + inset) / ATLAS_SIZE;
    const du = (r.width - 2 * inset) / ATLAS_SIZE;
    const dv = (r.height - 2 * inset) / ATLAS_SIZE;
    const v0 = 1 - (r.y + r.height - inset) / ATLAS_SIZE; // texture v runs bottom-up
    return [u0, v0, du, dv];
  }
}

// ----- Pulling a row out of the rack -----

/** How far a selected bottle comes out of the rack (rack units) and how far it tips toward the viewer. */
export const PULL_DISTANCE = 2.6;
export const PULL_TILT = (50 * Math.PI) / 180;
export const PULL_DURATION_MS = 350;

export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}

/** Offset toward the viewer and tilt of a bottle at pull progress 0 (in the shelf) … 1 (fully out). */
export function slidePose(progress: number): { z: number; tilt: number } {
  const e = easeOutCubic(progress);
  // The tilt lags behind the slide so the bottle does not rise into the shelf above while still inside.
  return { z: PULL_DISTANCE * e, tilt: PULL_TILT * e * e };
}
