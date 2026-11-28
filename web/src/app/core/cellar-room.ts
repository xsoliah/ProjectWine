import { WineType } from './models';

/** One slot is 12 x 12 cm, a rack is 38 cm deep (same rules as the server). */
export const CELL_CM = 12;
export const RACK_DEPTH_CM = 38;
export const SNAP_CM = 10;
export const STEP_CM = 10;
export const DOOR_WIDTH_CM = 90;
export const DOOR_HEIGHT_CM = 205;
export const MAX_ELEVATION_CM = 200;

export interface RackPlacement {
  /** Distance of the left edge from the left wall (cm). */
  x: number;
  /** Distance of the back edge from the back wall (cm). */
  z: number;
  /** Quarter turns clockwise, 0-3. */
  rotation: number;
  /** Height above the floor in cm (0 or missing = on the floor). */
  elevationCm?: number;
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

/** Door wall: 0 = back, 1 = right, 2 = front, 3 = left. */
export interface RoomDoor {
  wall: number;
  offsetCm: number;
}

export interface CellarRoom {
  widthCm: number;
  depthCm: number;
  heightCm: number;
  racks: RoomRack[];
  door?: RoomDoor | null;
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
    elevationCm: p.elevationCm,
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
  const height = p.elevationCm ? `, ${p.elevationCm} cm über dem Boden` : '';
  return `${p.x} cm von links, ${p.z} cm von hinten, Front ${front}${height}`;
}

export const WALL_NAMES = ['hinten', 'rechts', 'vorne', 'links'] as const;

export function wallLength(wall: number, room: RoomSize): number {
  return wall % 2 === 0 ? room.widthCm : room.depthCm;
}

/** Whether a door fits completely into its wall (same rule as the server). */
export function isDoorValid(door: RoomDoor, room: RoomSize): boolean {
  return (
    Number.isInteger(door.wall) &&
    door.wall >= 0 &&
    door.wall <= 3 &&
    door.offsetCm >= 0 &&
    door.offsetCm + DOOR_WIDTH_CM <= wallLength(door.wall, room)
  );
}

/** Door height: 205 cm, but never higher than the room. */
export function doorHeight(roomHeightCm: number): number {
  return Math.min(DOOR_HEIGHT_CM, roomHeightCm);
}

/**
 * Puts the door on the wall nearest to a floor point (cm), centred under the point,
 * kept inside the wall and snapped to the wall ends within `tolerance` cm.
 */
export function projectToWall(room: RoomSize, point: { x: number; z: number }, tolerance = SNAP_CM): RoomDoor {
  const distances = [point.z, room.widthCm - point.x, room.depthCm - point.z, point.x];
  const wall = distances.indexOf(Math.min(...distances));
  const along = wall % 2 === 0 ? point.x : point.z;
  const max = wallLength(wall, room) - DOOR_WIDTH_CM;
  let offset = Math.min(Math.max(Math.round(along - DOOR_WIDTH_CM / 2), 0), max);
  if (offset <= tolerance) offset = 0;
  else if (max - offset <= tolerance) offset = max;
  return { wall, offsetCm: offset };
}

/** Whether the rack, lifted by `elevationCm`, still fits under the ceiling (no check at 0, like the server). */
export function checkHeight(roomHeightCm: number, rack: { name: string; height: number }, elevationCm: number): FitResult {
  if (elevationCm > 0 && elevationCm + rack.height * CELL_CM > roomHeightCm) {
    return { ok: false, reason: `„${rack.name}“ passt auf ${elevationCm} cm Höhe nicht unter die Decke.` };
  }
  return { ok: true };
}

export function describeDoor(door: RoomDoor | null | undefined): string {
  if (!door) return 'keine Tür';
  const wall = ['hinteren', 'rechten', 'vorderen', 'linken'][door.wall] ?? 'vordere';
  return `Tür an der ${wall} Wand, ${door.offsetCm} cm vom Wandanfang`;
}
