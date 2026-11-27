import { WineType } from './models';

/** One slot is 12 x 12 cm, a rack is 38 cm deep (same rules as the server). */
export const CELL_CM = 12;
export const RACK_DEPTH_CM = 38;
export const SNAP_CM = 10;
export const STEP_CM = 10;

export interface RackPlacement {
  /** Distance of the left edge from the left wall (cm). */
  x: number;
  /** Distance of the back edge from the back wall (cm). */
  z: number;
  /** Quarter turns clockwise, 0-3. */
  rotation: number;
}

export interface RoomSlot {
  row: number;
  column: number;
  type: WineType;
}

export interface RoomRack {
  id: string;
  name: string;
  height: number;
  width: number;
  occupied: number;
  free: number;
  placement: RackPlacement | null;
  slots: RoomSlot[];
}

export interface CellarRoom {
  widthCm: number;
  depthCm: number;
  heightCm: number;
  racks: RoomRack[];
}

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface RoomSize {
  widthCm: number;
  depthCm: number;
}

/** Floor area of a rack at the given placement (min corner plus size, depending on the rotation). */
export function footprint(rack: { width: number }, p: RackPlacement): Rect {
  const w = rack.width * CELL_CM;
  return p.rotation % 2 === 0 ? { x: p.x, z: p.z, w, d: RACK_DEPTH_CM } : { x: p.x, z: p.z, w: RACK_DEPTH_CM, d: w };
}

/** Whether two areas share more than an edge (touching is allowed). */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
}

export function isInside(r: Rect, room: RoomSize): boolean {
  return r.x >= 0 && r.z >= 0 && r.x + r.w <= room.widthCm && r.z + r.d <= room.depthCm;
}

export type FitResult = { ok: true } | { ok: false; reason: string };

/** Checks a candidate placement of `rack` against the room and the other placed racks. */
export function checkFit(room: RoomSize, rack: RoomRack, p: RackPlacement, all: readonly RoomRack[]): FitResult {
  const rect = footprint(rack, p);
  if (!isInside(rect, room)) return { ok: false, reason: `„${rack.name}“ ragt über den Raum hinaus.` };
  for (const other of all) {
    if (other.id === rack.id || !other.placement) continue;
    if (overlaps(rect, footprint(other, other.placement))) {
      return { ok: false, reason: `„${rack.name}“ überlappt „${other.name}“.` };
    }
  }
  return { ok: true };
}

/** Turns the rack by 90° around its centre (the centre is rounded to whole cm). */
export function rotateAround(rack: { width: number }, p: RackPlacement): RackPlacement {
  const before = footprint(rack, p);
  const rotation = (p.rotation + 1) % 4;
  const after = footprint(rack, { ...p, rotation });
  return {
    rotation,
    x: Math.round(p.x + before.w / 2 - after.w / 2),
    z: Math.round(p.z + before.d / 2 - after.d / 2),
  };
}

/** Snaps the area to the room walls and to the edges of other racks within `tolerance` cm; returns the new min corner. */
export function snapPosition(
  rect: Rect,
  room: RoomSize,
  others: readonly Rect[],
  tolerance = SNAP_CM,
): { x: number; z: number } {
  const edgesX = others
    .filter((o) => rangesNear(rect.z, rect.d, o.z, o.d, tolerance))
    .flatMap((o) => [o.x + o.w, o.x - rect.w]);
  const edgesZ = others
    .filter((o) => rangesNear(rect.x, rect.w, o.x, o.w, tolerance))
    .flatMap((o) => [o.z + o.d, o.z - rect.d]);
  return {
    x: Math.round(nearest(rect.x, [0, room.widthCm - rect.w, ...edgesX], tolerance)),
    z: Math.round(nearest(rect.z, [0, room.depthCm - rect.d, ...edgesZ], tolerance)),
  };
}

function rangesNear(a: number, aLen: number, b: number, bLen: number, tolerance: number): boolean {
  return a < b + bLen + tolerance && b < a + aLen + tolerance;
}

function nearest(value: number, targets: number[], tolerance: number): number {
  let best = value;
  let bestDistance = tolerance + 1;
  for (const target of targets) {
    const distance = Math.abs(target - value);
    if (distance <= tolerance && distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }
  return best;
}

/** First free spot for a rack (rotation 0, then 90°), scanning from the back left in `step` cm; null when there is none. */
export function firstFreeSpot(
  room: RoomSize,
  rack: RoomRack,
  all: readonly RoomRack[],
  step = STEP_CM,
): RackPlacement | null {
  for (const rotation of [0, 1]) {
    const probe = footprint(rack, { x: 0, z: 0, rotation });
    for (let z = 0; z + probe.d <= room.depthCm; z += step) {
      for (let x = 0; x + probe.w <= room.widthCm; x += step) {
        const p = { x, z, rotation };
        if (checkFit(room, rack, p, all).ok) return p;
      }
    }
  }
  return null;
}

/** Short text for the list, e.g. "50 cm von links, 20 cm von hinten, Front nach vorn". */
export function describePlacement(p: RackPlacement | null): string {
  if (!p) return 'nicht platziert';
  const front = ['nach vorn', 'nach links', 'nach hinten', 'nach rechts'][p.rotation] ?? 'nach vorn';
  return `${p.x} cm von links, ${p.z} cm von hinten, Front ${front}`;
}
