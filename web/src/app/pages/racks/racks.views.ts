import { WINE_TYPES, wineTypeLabel } from '../../core/labels';
import { Column, Dimension, FilterDef, Measure, PivotConfig } from '../../core/list-views';
import { Rack, RackSummary } from '../../core/models';

export const FILL_EMPTY = 'Leer';
export const FILL_PARTIAL = 'Teilbelegt';
export const FILL_FULL = 'Voll';
export const FILL_OPTIONS = [FILL_EMPTY, FILL_PARTIAL, FILL_FULL] as const;

/** Belegung eines Regals als Anzeigetext. */
export function fillState(rack: Pick<RackSummary, 'occupied' | 'capacity'>): string {
  if (rack.occupied === 0) return FILL_EMPTY;
  return rack.occupied >= rack.capacity ? FILL_FULL : FILL_PARTIAL;
}

export const RACKS_PIVOT: PivotConfig = { row: 'rack', col: 'type', measure: 'count' };

/** Spalten der Regaltabelle; die erste (Name) ist immer sichtbar. */
export function rackColumns(): Column<RackSummary>[] {
  return [
    { key: 'name', title: 'Name', type: 'text', value: (r) => r.name, defaultVisible: true },
    { key: 'height', title: 'Reihen', type: 'number', value: (r) => r.height, defaultVisible: true },
    { key: 'width', title: 'Spalten', type: 'number', value: (r) => r.width, defaultVisible: true },
    { key: 'capacity', title: 'Kapazität', type: 'number', value: (r) => r.capacity, defaultVisible: true },
    { key: 'occupied', title: 'Belegt', type: 'number', value: (r) => r.occupied, defaultVisible: true },
    { key: 'free', title: 'Frei', type: 'number', value: (r) => r.free, defaultVisible: true },
  ];
}

export function rackFilters(): FilterDef<RackSummary>[] {
  return [
    { kind: 'text', key: 'name', title: 'Name', texts: (r) => [r.name] },
    { kind: 'multi', key: 'fill', title: 'Belegung', values: (r) => [fillState(r)], options: FILL_OPTIONS },
  ];
}

/** Nur für Schlüssel und Titel im Zustand der Liste; ausgewertet wird das Pivot über {@link RackFact}. */
export function rackKeyDimensions(): Dimension<RackSummary>[] {
  return [
    { key: 'rack', title: 'Regal', values: (r) => [r.name] },
    { key: 'type', title: 'Weinart', values: () => [] },
    { key: 'occ', title: 'Belegung', values: () => [] },
  ];
}

export function rackKeyMeasures(): Measure<RackSummary>[] {
  return [{ key: 'count', title: 'Anzahl', kind: 'sum', value: () => null, format: String }];
}

/** Eine Flasche (Weinart-Pivot) bzw. eine Fächergruppe (Belegungs-Pivot) eines Regals. */
export interface RackFact {
  rack: string;
  type: string;
  occ: string;
  count: number;
}

export const OCC_USED = 'Belegt';
export const OCC_FREE = 'Frei';

/** Pivot-Zeilen „Regal × Weinart“: eine je belegtem Fach. */
export function bottleFacts(racks: readonly RackSummary[], details: ReadonlyMap<string, Rack>): RackFact[] {
  const facts: RackFact[] = [];
  for (const rack of racks) {
    for (const slot of details.get(rack.id)?.slots ?? []) {
      facts.push({ rack: rack.name, type: wineTypeLabel(slot.wine.type), occ: OCC_USED, count: 1 });
    }
  }
  return facts;
}

/** Pivot-Zeilen „Regal × Belegung“: belegte und freie Fächer je Regal. */
export function occupancyFacts(racks: readonly RackSummary[]): RackFact[] {
  return racks.flatMap((r) => [
    { rack: r.name, type: '', occ: OCC_USED, count: r.occupied },
    { rack: r.name, type: '', occ: OCC_FREE, count: r.free },
  ]);
}

export function factDimensions(mode: 'type' | 'occ'): Dimension<RackFact>[] {
  return [
    { key: 'rack', title: 'Regal', values: (f) => [f.rack] },
    mode === 'type'
      ? { key: 'type', title: 'Weinart', values: (f) => [f.type], order: WINE_TYPES.map((t) => t.label) }
      : { key: 'occ', title: 'Belegung', values: (f) => [f.occ], order: [OCC_USED, OCC_FREE] },
  ];
}

export function factMeasures(mode: 'type' | 'occ'): Measure<RackFact>[] {
  return [
    {
      key: 'count',
      title: mode === 'type' ? 'Anzahl Flaschen' : 'Anzahl Fächer',
      kind: 'sum',
      value: (f) => f.count,
      format: (v) => String(v),
    },
  ];
}
