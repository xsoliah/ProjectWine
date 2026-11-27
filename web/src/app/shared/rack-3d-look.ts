import { BOTTLE_LENGTH } from '../core/bottle';
import { RackSlot, WineType } from '../core/models';

/** Natural bottle glass colors (instead of the bright type badge colors). */
export const GLASS_BY_TYPE: Record<WineType, string> = {
  Red: '#101a0c',
  White: '#dfe6cf',
  Rose: '#d9b4b0',
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

/** How far a selected bottle comes out of the rack (rack units); it also rolls by 180° and stands up by 90°. */
export const PULL_DISTANCE = 2.6;
export const PULL_ROLL = Math.PI;
export const PULL_PITCH = Math.PI / 2;
export const PULL_DURATION_MS = 450;

export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}

/** Smooth 0…1 ramp of `progress` between `from` and `to`. */
function smoothstep(from: number, to: number, progress: number): number {
  const t = Math.min(1, Math.max(0, (progress - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/**
 * Offset toward the viewer, roll around the bottle's long axis and pitch (standing up) of a bottle at pull
 * progress 0 (lying in the shelf) … 1 (fully out, upright, label to the viewer). The phases overlap:
 * sliding out first, rolling meanwhile, standing up last so the neck never rises into the shelf above.
 */
export function slidePose(progress: number): { z: number; roll: number; pitch: number } {
  return {
    z: PULL_DISTANCE * easeOutCubic(progress / 0.7),
    roll: PULL_ROLL * smoothstep(0.1, 0.6, progress),
    pitch: PULL_PITCH * smoothstep(0.45, 1, progress),
  };
}

// ----- Zooming onto a bottle -----

/** Height of an upright bottle's middle above its row centre: the label sits a little below the middle, so the bottle reaches about equally far up and down. */
export const UPRIGHT_LIFT = 0.2;
/** Share of the free view height that a focused bottle fills (it must be fully visible). */
export const FOCUS_FILL = 0.9;
/** Share of the 3D area's height the description sheet covers at the bottom while a bottle is focused. */
export const FOCUS_INSET = 0.28;
export const FOCUS_DURATION_MS = 450;
export const NEIGHBOR_DURATION_MS = 300;

/** Camera distance at which an object of `height` fills `fill` (0…1) of the visible height. */
export function frameDistance(fovDegrees: number, height: number, fill: number): number {
  const halfFov = (fovDegrees / 2) * (Math.PI / 180);
  return height / (2 * fill * Math.tan(halfFov));
}

/** Point the camera looks at to focus a pulled-out bottle: its middle, `scale` being the bottle's size factor. */
export function focusTarget(x: number, rowY: number, scale: number): { x: number; y: number; z: number } {
  return { x, y: rowY + UPRIGHT_LIFT * scale, z: PULL_DISTANCE };
}

/** Camera distance that frames the whole bottle in the part of the view not covered by the sheet (`inset` = covered share). */
export function focusDistance(fovDegrees: number, scale: number, inset: number): number {
  return frameDistance(fovDegrees, BOTTLE_LENGTH * scale, FOCUS_FILL * (1 - inset));
}

/** The next bottle of a row to the left or right of `current`; null at the end of the row. Free slots are skipped because they are not listed. */
export function neighborSlot(slots: RackSlot[], current: RackSlot, direction: 'prev' | 'next'): RackSlot | null {
  const row = slots.filter((s) => s.row === current.row).sort((a, b) => a.column - b.column);
  const index = row.findIndex((s) => s.id === current.id);
  if (index < 0) return null;
  return row[index + (direction === 'next' ? 1 : -1)] ?? null;
}

/** Where a bottle stands in its row: 1-based rank among the occupied slots and their number. */
export function rowPosition(slots: RackSlot[], current: RackSlot): { rank: number; count: number } {
  const row = slots.filter((s) => s.row === current.row).sort((a, b) => a.column - b.column);
  return { rank: row.findIndex((s) => s.id === current.id) + 1, count: row.length };
}
