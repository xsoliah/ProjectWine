import { wineTitle } from '../../core/format';
import { WINE_TYPES, wineTypeLabel } from '../../core/labels';
import { ListField, ListMeasure } from '../../core/list-model';
import { PivotLayout } from '../../core/list-view-state';
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

/** Eine Flasche im Regalfach: Zeile des Pivots. */
export interface RackFact {
  rack: string;
  row: number;
  column: number;
  type: string;
  wine: string;
}

export function bottleFacts(racks: readonly RackSummary[], details: ReadonlyMap<string, Rack>): RackFact[] {
  return racks.flatMap((rack) =>
    (details.get(rack.id)?.slots ?? []).map((slot) => ({
      rack: rack.name,
      row: slot.row,
      column: slot.column,
      type: wineTypeLabel(slot.wine.type),
      wine: wineTitle(slot.wine),
    })),
  );
}

/** Pivot-Felder der Flaschen; ein Klick schlüsselt auf die entsprechenden Felder der Regaltabelle auf. */
export function factFields(): ListField<RackFact>[] {
  return [
    { key: 'rack', title: 'Regal', type: 'string', value: (f) => f.rack, pivot: true, drill: { key: 'name', op: '=' } },
    {
      key: 'type',
      title: 'Weinart',
      type: 'string',
      value: (f) => f.type,
      order: WINE_TYPES.map((t) => t.label),
      pivot: true,
      drill: { key: 'types', op: 'contains' },
    },
    { key: 'wine', title: 'Wein', type: 'string', value: (f) => f.wine, pivot: true, drill: { key: 'wines', op: 'contains' } },
    { key: 'row', title: 'Reihe', type: 'number', value: (f) => f.row, pivot: true, drill: null },
    { key: 'column', title: 'Spalte', type: 'number', value: (f) => f.column, pivot: true, drill: null },
  ];
}

export function factMeasures(): ListMeasure<RackFact>[] {
  return [{ key: 'bottles', title: 'Anzahl Flaschen', kind: 'sum', value: () => 1, format: 'integer' }];
}

export const RACKS_PIVOT: PivotLayout = { rows: ['rack'], cols: ['type'], data: ['bottles'] };
