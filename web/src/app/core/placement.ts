import { HttpErrorResponse } from '@angular/common/http';
import { Rack, RackSummary, SuggestedSlot } from './models';

/** What to do after bottles were added: show the placing step, point to creating a rack, or nothing. */
export type PlacementOffer = 'offer' | 'no-rack' | 'none';

/**
 * Whether the "Einlagern" step is shown: only when bottles are waiting and at least one rack has a free slot.
 * Without any rack the user is pointed to creating one; with only full racks nothing is shown.
 */
export function placementOffer(racks: Pick<RackSummary, 'free'>[], bottles: number): PlacementOffer {
  if (bottles <= 0) return 'none';
  if (racks.length === 0) return 'no-rack';
  return racks.some((r) => r.free > 0) ? 'offer' : 'none';
}

/** Bottles the step is about: the ones just added, but never more than are not placed. */
export function bottlesToPlace(added: number, unplacedCount: number): number {
  return Math.max(0, Math.min(added, unplacedCount));
}

export type MiniCellState = 'free' | 'taken' | 'suggested';

export interface MiniCell {
  column: number;
  state: MiniCellState;
}

export interface MiniRow {
  row: number;
  cells: MiniCell[];
}

export interface MiniGrid {
  rackId: string;
  rackName: string;
  rows: MiniRow[];
}

/** Only the rows that contain a suggested slot, each with all its columns, for the small preview. */
export function miniGrid(rack: Pick<Rack, 'id' | 'name' | 'width' | 'slots'>, suggested: SuggestedSlot[]): MiniGrid {
  const mine = suggested.filter((s) => s.rackId === rack.id);
  const rows = [...new Set(mine.map((s) => s.row))].sort((a, b) => a - b);
  return {
    rackId: rack.id,
    rackName: rack.name,
    rows: rows.map((row) => ({
      row,
      cells: Array.from({ length: rack.width }, (_, i) => {
        const column = i + 1;
        const state: MiniCellState = mine.some((s) => s.row === row && s.column === column)
          ? 'suggested'
          : rack.slots.some((s) => s.row === row && s.column === column)
            ? 'taken'
            : 'free';
        return { column, state };
      }),
    })),
  };
}

/** The distinct racks of a suggestion, in the order of their first slot. */
export function suggestedRackIds(slots: SuggestedSlot[]): string[] {
  return [...new Set(slots.map((s) => s.rackId))];
}

/** A slot was taken in the meantime (HTTP 409): the step asks for a new suggestion. */
export function isSlotConflict(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 409;
}

/** Short summary line, e.g. "3 Flaschen: Keller links, Reihe 1, Spalte 1–3". */
export function suggestionSummary(slots: SuggestedSlot[]): string {
  if (slots.length === 0) return '';
  const byRowAndRack = new Map<string, SuggestedSlot[]>();
  for (const s of slots) {
    const key = `${s.rackId}|${s.row}`;
    byRowAndRack.set(key, [...(byRowAndRack.get(key) ?? []), s]);
  }
  const parts = [...byRowAndRack.values()].map((group) => {
    const columns = group.map((s) => s.column).sort((a, b) => a - b);
    const text = describeColumns(columns);
    return `${group[0].rackName}, Reihe ${group[0].row}, ${text}`;
  });
  return parts.join(' · ');
}

function describeColumns(columns: number[]): string {
  const runs: string[] = [];
  let start = columns[0];
  let previous = columns[0];
  for (const c of [...columns.slice(1), Number.NaN]) {
    if (c === previous + 1) {
      previous = c;
      continue;
    }
    runs.push(start === previous ? `${start}` : `${start}–${previous}`);
    start = c;
    previous = c;
  }
  return `Spalte${columns.length === 1 ? '' : 'n'} ${runs.join(', ')}`;
}
