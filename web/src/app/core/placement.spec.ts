import { HttpErrorResponse } from '@angular/common/http';
import { SuggestedSlot } from './models';
import {
  bottlesToPlace,
  isSlotConflict,
  miniGrid,
  placementOffer,
  suggestedRackIds,
  suggestionSummary,
} from './placement';

const slot = (row: number, column: number, rackId = 'r1', rackName = 'Keller links'): SuggestedSlot => ({
  rackId,
  rackName,
  row,
  column,
});

describe('placementOffer', () => {
  it('offers the step when a rack has a free slot', () => {
    expect(placementOffer([{ free: 0 }, { free: 3 }], 2)).toBe('offer');
  });

  it('points to creating a rack when there is none', () => {
    expect(placementOffer([], 2)).toBe('no-rack');
  });

  it('shows nothing when all racks are full', () => {
    expect(placementOffer([{ free: 0 }], 2)).toBe('none');
  });

  it('shows nothing without bottles to place', () => {
    expect(placementOffer([{ free: 5 }], 0)).toBe('none');
    expect(placementOffer([], 0)).toBe('none');
  });
});

describe('bottlesToPlace', () => {
  it('takes the added bottles', () => {
    expect(bottlesToPlace(3, 3)).toBe(3);
    expect(bottlesToPlace(1, 1)).toBe(1);
  });

  it('is limited to the not placed bottles', () => {
    expect(bottlesToPlace(3, 2)).toBe(2);
    expect(bottlesToPlace(2, 0)).toBe(0);
  });
});

describe('miniGrid', () => {
  const rack = {
    id: 'r1',
    name: 'Keller links',
    width: 4,
    slots: [{ id: 's', row: 2, column: 1, wine: { id: 'w', name: 'X', producer: null, vintage: null, type: 'Red' as const } }],
  };

  it('shows the rows of the suggestion with free, taken and suggested slots', () => {
    const grid = miniGrid(rack, [slot(2, 2), slot(2, 3)]);
    expect(grid.rows.map((r) => r.row)).toEqual([2]);
    expect(grid.rows[0].cells.map((c) => c.state)).toEqual(['taken', 'suggested', 'suggested', 'free']);
  });

  it('ignores slots of other racks', () => {
    expect(miniGrid(rack, [slot(1, 1, 'other')]).rows).toEqual([]);
  });
});

describe('suggestion text', () => {
  it('lists the racks of a suggestion once', () => {
    expect(suggestedRackIds([slot(1, 1), slot(1, 2), slot(2, 1, 'r2', 'Rechts')])).toEqual(['r1', 'r2']);
  });

  it('summarizes a run of columns', () => {
    expect(suggestionSummary([slot(1, 1), slot(1, 2), slot(1, 3)])).toBe('Keller links, Reihe 1, Spalten 1–3');
    expect(suggestionSummary([slot(2, 4)])).toBe('Keller links, Reihe 2, Spalte 4');
  });

  it('summarizes several rows and racks', () => {
    expect(suggestionSummary([slot(1, 5), slot(1, 6), slot(2, 1, 'r2', 'Rechts')])).toBe(
      'Keller links, Reihe 1, Spalten 5–6 · Rechts, Reihe 2, Spalte 1',
    );
  });
});

describe('isSlotConflict', () => {
  it('recognizes HTTP 409 only', () => {
    expect(isSlotConflict(new HttpErrorResponse({ status: 409 }))).toBe(true);
    expect(isSlotConflict(new HttpErrorResponse({ status: 400 }))).toBe(false);
    expect(isSlotConflict(new Error('x'))).toBe(false);
  });
});
