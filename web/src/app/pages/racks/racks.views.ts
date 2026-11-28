import { wineTitle } from '../../core/format';
import { wineTypeLabel } from '../../core/labels';
import { ListField } from '../../core/list-model';
import { Rack, RackSummary } from '../../core/models';

export const FILL_EMPTY = 'Leer';
export const FILL_PARTIAL = 'Teilbelegt';
export const FILL_FULL = 'Voll';

/** Belegung eines Regals als Anzeigetext. */
export function fillState(rack: Pick<RackSummary, 'occupied' | 'capacity'>): string {
  if (rack.occupied === 0) return FILL_EMPTY;
  return rack.occupied >= rack.capacity ? FILL_FULL : FILL_PARTIAL;
}

/** Ein Regal samt Weinarten und Weinen der belegten Fächer (leer, solange die Details nicht geladen sind). */
export interface RackRow extends RackSummary {
  types: string[];
  wines: string[];
}

export function rackRows(racks: readonly RackSummary[], details: ReadonlyMap<string, Rack>): RackRow[] {
  return racks.map((r) => {
    const slots = details.get(r.id)?.slots ?? [];
    return {
      ...r,
      types: [...new Set(slots.map((s) => wineTypeLabel(s.wine.type)))],
      wines: [...new Set(slots.map((s) => wineTitle(s.wine)))],
    };
  });
}

/** Felder der Regaltabelle und des Filters; die erste (Name) ist immer sichtbar. */
export function rackFields(): ListField<RackRow>[] {
  return [
    { key: 'name', title: 'Name', type: 'string', value: (r) => r.name, column: 'default' },
    { key: 'height', title: 'Reihen', type: 'number', value: (r) => r.height, column: 'default' },
    { key: 'width', title: 'Spalten', type: 'number', value: (r) => r.width, column: 'default' },
    { key: 'capacity', title: 'Kapazität', type: 'number', value: (r) => r.capacity, column: 'default' },
    { key: 'occupied', title: 'Belegt', type: 'number', value: (r) => r.occupied, column: 'default' },
    { key: 'free', title: 'Frei', type: 'number', value: (r) => r.free, column: 'default' },
    { key: 'fill', title: 'Belegung', type: 'string', value: fillState, order: [FILL_EMPTY, FILL_PARTIAL, FILL_FULL] },
    { key: 'types', title: 'Weinarten', type: 'string', value: () => null, values: (r) => r.types, column: 'optional' },
    { key: 'wines', title: 'Weine', type: 'string', value: () => null, values: (r) => r.wines, column: 'optional' },
  ];
}
