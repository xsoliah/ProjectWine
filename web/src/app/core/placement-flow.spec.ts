import { RackSummary } from './models';
import { decidePlacement } from './placement-flow';

const rack = (free: number): RackSummary => ({ id: 'r', name: 'R', height: 5, width: 6, capacity: 30, occupied: 30 - free, free });
const wine = { id: 'w1', name: 'Zweigelt', unplacedCount: 3 };

describe('decidePlacement', () => {
  it('shows the step for the created bottles when a rack has room', async () => {
    const result = await decidePlacement(async () => [rack(10)], wine, 3);
    expect(result.offer).toBe('offer');
    expect(result.request).toEqual({ wineId: 'w1', wineName: 'Zweigelt', count: 3 });
  });

  it('is about the added bottles only, not all unplaced ones', async () => {
    const result = await decidePlacement(async () => [rack(10)], { ...wine, unplacedCount: 4 }, 1);
    expect(result.request?.count).toBe(1);
  });

  it('never asks for more bottles than are not placed', async () => {
    const result = await decidePlacement(async () => [rack(10)], { ...wine, unplacedCount: 1 }, 3);
    expect(result.request?.count).toBe(1);
  });

  it('points to creating a rack when there is none', async () => {
    const result = await decidePlacement(async () => [], wine, 3);
    expect(result).toEqual({ offer: 'no-rack', request: null });
  });

  it('skips the step when all racks are full', async () => {
    const result = await decidePlacement(async () => [rack(0)], wine, 3);
    expect(result).toEqual({ offer: 'none', request: null });
  });

  it('skips the step when the racks cannot be loaded', async () => {
    const result = await decidePlacement(() => Promise.reject(new Error('offline')), wine, 3);
    expect(result).toEqual({ offer: 'none', request: null });
  });
});
