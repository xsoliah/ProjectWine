import { Rack, RackSlot, RackSummary, SlotLocation } from './models';

/** Storage key of the rack opened last (used by "In 3D ansehen" in the cellar list). */
export const LAST_RACK_KEY = 'lastRackId';

export interface Cell {
  row: number;
  column: number;
}

/** Index of a slot in row-major order (row 1 / column 1 first); used for the 3D hit boxes. */
export function cellIndex(row: number, column: number, width: number): number {
  return (row - 1) * width + (column - 1);
}

/** Inverse of {@link cellIndex}. */
export function cellFromIndex(index: number, width: number): Cell {
  return { row: Math.floor(index / width) + 1, column: (index % width) + 1 };
}

export interface RowEntry {
  column: number;
  slot: RackSlot | null;
}

/** All slots of one row from left to right, free ones with `slot: null`. */
export function rowEntries(rack: Pick<Rack, 'width' | 'slots'>, row: number): RowEntry[] {
  return Array.from({ length: rack.width }, (_, i) => ({
    column: i + 1,
    slot: rack.slots.find((s) => s.row === row && s.column === i + 1) ?? null,
  }));
}

export function slotAt(rack: Pick<Rack, 'slots'>, row: number, column: number): RackSlot | null {
  return rack.slots.find((s) => s.row === row && s.column === column) ?? null;
}

export function occupiedInRow(rack: Pick<Rack, 'slots'>, row: number): number {
  return rack.slots.filter((s) => s.row === row).length;
}

/** The last opened rack if it still exists, otherwise the first by name (the list is sorted by name). */
export function rackToOpen(racks: RackSummary[], lastId: string | null): RackSummary | null {
  return racks.find((r) => r.id === lastId) ?? racks[0] ?? null;
}

export function slotLabel(slot: Pick<SlotLocation, 'rackName' | 'row' | 'column'>): string {
  return `${slot.rackName} – Reihe ${slot.row}, Spalte ${slot.column}`;
}

/** Message after drinking/selling/gifting when slots were freed automatically. */
export function freedSlotsMessage(freed: SlotLocation[] | null | undefined): string | null {
  if (!freed || freed.length === 0) return null;
  const list = freed.map(slotLabel).join('; ');
  return freed.length === 1
    ? `Bitte nimm die Flasche aus ${list}.`
    : `Bitte nimm die Flaschen aus ${list}.`;
}

let webglSupport: boolean | null = null;

/** Whether the device can show the 3D view (checked once with a throw-away canvas, before loading three). */
export function webglAvailable(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    webglSupport = gl !== null;
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/** For tests and for "webglcontextlost": forget the cached answer. */
export function setWebglAvailable(value: boolean | null): void {
  webglSupport = value;
}
