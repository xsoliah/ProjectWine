import { RackSummary } from './models';
import { PlacementOffer, bottlesToPlace, placementOffer } from './placement';

/** What the "Einlagern" step is about. */
export interface PlacingRequest {
  wineId: string;
  wineName: string;
  count: number;
}

export interface PlacementDecision {
  offer: PlacementOffer;
  request: PlacingRequest | null;
}

/**
 * Decides after saving a wine or adding bottles whether to show the placing step.
 * Failing to load the racks never blocks the flow: the step is simply skipped.
 */
export async function decidePlacement(
  listRacks: () => Promise<RackSummary[]>,
  wine: { id: string; name: string; unplacedCount: number },
  added: number,
): Promise<PlacementDecision> {
  const count = bottlesToPlace(added, wine.unplacedCount);
  let racks: RackSummary[];
  try {
    racks = await listRacks();
  } catch {
    return { offer: 'none', request: null };
  }
  const offer = placementOffer(racks, count);
  return { offer, request: offer === 'offer' ? { wineId: wine.id, wineName: wine.name, count } : null };
}

export const NO_RACK_HINT = 'Lege ein Regal an, dann kannst du Flaschen mit einem Vorschlag einlagern.';
