import {
  cellFromIndex,
  cellIndex,
  freedSlotsMessage,
  rackToOpen,
  rowEntries,
  setWebglAvailable,
  slotLabel,
  webglAvailable,
} from './racks';
import { RackSlot, RackSummary } from './models';

const slot = (row: number, column: number, name: string): RackSlot => ({
  id: `${row}-${column}`,
  row,
  column,
  wine: { id: name, name, producer: null, vintage: null, type: 'Red' },
});

describe('cellIndex / cellFromIndex', () => {
  it('numbers slots row by row from the top left', () => {
    expect(cellIndex(1, 1, 6)).toBe(0);
    expect(cellIndex(1, 6, 6)).toBe(5);
    expect(cellIndex(2, 1, 6)).toBe(6);
    expect(cellIndex(5, 6, 6)).toBe(29);
  });

  it('maps a tapped instance back to row and column', () => {
    expect(cellFromIndex(0, 6)).toEqual({ row: 1, column: 1 });
    expect(cellFromIndex(8, 6)).toEqual({ row: 2, column: 3 });
    expect(cellFromIndex(29, 6)).toEqual({ row: 5, column: 6 });
  });

  it('round-trips every slot of a 50 x 50 rack', () => {
    for (let row = 1; row <= 50; row++) {
      for (let column = 1; column <= 50; column++) {
        expect(cellFromIndex(cellIndex(row, column, 50), 50)).toEqual({ row, column });
      }
    }
  });
});

describe('rowEntries', () => {
  it('lists every column of the row, free slots included (scenario "Reihe 2 antippen")', () => {
    const rack = { width: 6, slots: [slot(2, 3, 'Sassicaia'), slot(2, 5, 'Zweigelt'), slot(1, 1, 'Merlot')] };
    expect(rowEntries(rack, 2).map((e) => e.slot?.wine.name ?? 'frei')).toEqual([
      'frei', 'frei', 'Sassicaia', 'frei', 'Zweigelt', 'frei',
    ]);
  });
});

describe('rackToOpen', () => {
  const racks = [
    { id: 'a', name: 'Gang' },
    { id: 'b', name: 'Keller rechts' },
  ] as RackSummary[];

  it('prefers the rack opened last', () => expect(rackToOpen(racks, 'b')?.id).toBe('b'));
  it('falls back to the first by name', () => expect(rackToOpen(racks, 'deleted')?.id).toBe('a'));
  it('returns null without racks', () => expect(rackToOpen([], 'b')).toBeNull());
});

describe('freedSlotsMessage', () => {
  it('names the freed slots', () => {
    expect(freedSlotsMessage([{ slotId: '1', rackId: 'r', rackName: 'Keller links', row: 1, column: 1 }])).toBe(
      'Bitte nimm die Flasche aus Keller links – Reihe 1, Spalte 1.',
    );
  });
  it('is silent when nothing was freed', () => expect(freedSlotsMessage([])).toBeNull());
  it('formats a slot label', () =>
    expect(slotLabel({ rackName: 'Gang', row: 3, column: 2 })).toBe('Gang – Reihe 3, Spalte 2'));
});

describe('webglAvailable', () => {
  afterEach(() => setWebglAvailable(null));

  it('is false when the browser cannot create a WebGL context (scenario "Gerät ohne 3D")', () => {
    setWebglAvailable(null);
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof original;
    try {
      expect(webglAvailable()).toBe(false);
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
    }
  });
});
