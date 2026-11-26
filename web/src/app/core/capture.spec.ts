import { captureMarks, captureToInitial } from './capture';
import { CaptureDetail } from './models';

const detail = (patch: Partial<CaptureDetail> = {}): CaptureDetail => ({
  summary: {
    id: 'd1', status: 'Ready', frontImageId: 'f1', labelPreviewImageId: 'p1', name: 'Sassicaia', vintage: 2021,
    bottleCount: 2, error: null, createdAt: '2026-11-26T10:00:00Z',
  },
  backImageId: null, userNote: null, labelCorners: null, labelCornersDetected: false, researchSummary: null,
  nothingFoundOnWeb: false,
  name: { value: 'Sassicaia', source: 'Label' },
  producer: { value: 'Tenuta San Guido', source: 'Label' },
  vintage: { value: 2021, source: 'Label' },
  type: { value: 'Red', source: 'Web' },
  country: { value: 'Italien', source: 'Web' },
  region: { value: 'Bolgheri', source: 'Label' },
  bottleSizeMl: null, drinkFrom: { value: 2028, source: 'Web' }, drinkUntil: { value: 2045, source: 'Web' },
  barcode: null, notes: { value: 'Kraftvoll.', source: 'Web' },
  grapes: [
    { name: 'Cabernet Sauvignon', percent: 85, source: 'Web', grapeId: null },
    { name: 'Cabernet Franc', percent: 15, source: 'Web', grapeId: 'g2' },
  ],
  sources: [], countryId: null, regionId: null, existingWine: null,
  ...patch,
});

describe('captureToInitial', () => {
  it('prefills the wine form with values, bottle count and grapes by name', () => {
    expect(captureToInitial(detail())).toEqual({
      quantity: 2, name: 'Sassicaia', producer: 'Tenuta San Guido', vintage: 2021, type: 'Red',
      country: 'Italien', region: 'Bolgheri', drinkFrom: 2028, drinkUntil: 2045, notes: 'Kraftvoll.',
      grapes: [{ name: 'Cabernet Sauvignon', percent: 85 }, { name: 'Cabernet Franc', percent: 15 }],
    });
  });

  it('adds the user note to the notes and leaves unknown fields empty', () => {
    const initial = captureToInitial(detail({ notes: null, userNote: 'Geschenk von Tante Gerda', region: null, grapes: [] }));
    expect(initial.notes).toBe('Geschenk von Tante Gerda');
    expect(initial.region).toBeUndefined();
    expect(initial.grapes).toBeUndefined();
  });
});

describe('captureMarks', () => {
  it('marks every field with label or web', () => {
    const marks = captureMarks(detail());
    expect(marks.name).toBe('Label');
    expect(marks.country).toBe('Web');
    expect(marks.grapes).toBe('Web');
    expect(marks.barcode).toBeUndefined();
  });
});

describe('barcode of a draft', () => {
  const withBarcode = detail({ barcode: { value: '4006381333931', source: 'Label' } });

  it('prefills the form with the barcode', () => {
    expect(captureToInitial(withBarcode).barcode).toBe('4006381333931');
  });

  it('marks the barcode as coming from the label', () => {
    expect(captureMarks(withBarcode).barcode).toBe('Label');
  });
});
