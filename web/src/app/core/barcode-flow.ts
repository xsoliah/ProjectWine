import { BarcodeLookupResult, Wine, WineFormInitial } from './models';

export const UNKNOWN_BARCODE_HINT = 'Unbekannter Barcode – bitte Daten eingeben';

export type LookupOutcome =
  | { step: 'existing'; wine: Wine }
  | { step: 'form'; prefill: WineFormInitial; hint: string | null };

/** Decides what the "add wine" page shows after a barcode lookup. */
export function decideLookupOutcome(result: BarcodeLookupResult): LookupOutcome {
  if (result.source === 'Cellar' && result.existingWine) {
    return { step: 'existing', wine: result.existingWine };
  }
  if (result.source === 'External' && result.draft) {
    const { name, producer, vintage, type, region, country, grapes, bottleSizeMl } = result.draft;
    const prefill: WineFormInitial = { barcode: result.barcode };
    if (name) prefill.name = name;
    if (producer) prefill.producer = producer;
    if (vintage != null) prefill.vintage = vintage;
    if (type) prefill.type = type;
    if (region) prefill.region = region;
    if (country) prefill.country = country;
    // Grapes come split by the API (draftGrapes); unknown names are offered for creation in the form.
    const names = result.draftGrapes?.map((g) => g.name) ?? (grapes ? [grapes] : []);
    if (names.length > 0) prefill.grapes = names.map((name) => ({ name, percent: null }));
    if (bottleSizeMl) prefill.bottleSizeMl = bottleSizeMl;
    return { step: 'form', prefill, hint: null };
  }
  return { step: 'form', prefill: { barcode: result.barcode }, hint: UNKNOWN_BARCODE_HINT };
}

export function cleanBarcode(raw: string): string {
  return raw.replace(/\s+/g, '');
}
