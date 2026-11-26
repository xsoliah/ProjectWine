import { UNKNOWN_BARCODE_HINT, cleanBarcode, decideLookupOutcome } from './barcode-flow';
import { BarcodeLookupResult, Wine } from './models';

const wine: Wine = {
  id: '1', barcode: '4001', name: 'Riesling', producer: null, vintage: 2020, type: 'White',
  region: null, country: null, grapes: [], isCuvee: false, bottleSizeMl: 750, quantity: 2,
  slots: [], unplacedCount: 2, drinkFrom: null, drinkUntil: null, purchasePrice: null, notes: null,
};

describe('decideLookupOutcome', () => {
  it('shows the existing wine for a cellar hit', () => {
    const result: BarcodeLookupResult = { barcode: '4001', source: 'Cellar', existingWine: wine, draft: null };
    expect(decideLookupOutcome(result)).toEqual({ step: 'existing', wine });
  });

  it('prefills the form from an external draft', () => {
    const result: BarcodeLookupResult = {
      barcode: '4002', source: 'External', existingWine: null,
      draft: { name: 'Merlot', producer: null, vintage: 2019, type: 'Red', region: null, country: 'Frankreich', grapes: null, bottleSizeMl: null },
    };
    expect(decideLookupOutcome(result)).toEqual({
      step: 'form',
      prefill: { barcode: '4002', name: 'Merlot', vintage: 2019, type: 'Red', country: 'Frankreich' },
      hint: null,
    });
  });

  it('prefills grapes from the split draft grapes, known and new alike', () => {
    const result: BarcodeLookupResult = {
      barcode: '4004', source: 'External', existingWine: null,
      draft: { name: 'Casillero', producer: null, vintage: null, type: null, region: null, country: null, grapes: 'Merlot / Carménère', bottleSizeMl: null },
      draftGrapes: [{ name: 'Merlot', grapeId: 'm' }, { name: 'Carménère', grapeId: null }],
    };
    const outcome = decideLookupOutcome(result);
    expect(outcome.step === 'form' && outcome.prefill.grapes).toEqual([
      { name: 'Merlot', percent: null },
      { name: 'Carménère', percent: null },
    ]);
  });

  it('asks for manual input for unknown barcodes', () => {
    const result: BarcodeLookupResult = { barcode: '4003', source: 'None', existingWine: null, draft: null };
    expect(decideLookupOutcome(result)).toEqual({
      step: 'form', prefill: { barcode: '4003' }, hint: UNKNOWN_BARCODE_HINT,
    });
  });

  it('removes whitespace from typed barcodes', () => {
    expect(cleanBarcode(' 4001 234 ')).toBe('4001234');
  });
});
