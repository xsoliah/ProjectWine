import { isValidGtin } from './barcode-image-reader';
import { NO_BARCODE, applyPhotoFind, applyUserEdit, barcodeProblem, barcodeToSend } from './capture-barcode';

const VALID = '4006381333931';

describe('isValidGtin', () => {
  it('accepts valid codes of all lengths', () => {
    for (const code of ['4006381333931', '4001234567891', '96385074', '036000291452', '14006381333938']) {
      expect(isValidGtin(code)).toBe(true);
    }
  });

  it('rejects wrong check digits, wrong lengths and letters', () => {
    for (const code of ['4006381333932', '96385075', '12345', 'abcdefghijklm', '']) {
      expect(isValidGtin(code)).toBe(false);
    }
  });
});

describe('applyPhotoFind', () => {
  it('fills an empty field from a photo', () => {
    expect(applyPhotoFind(NO_BARCODE, VALID)).toEqual({ code: VALID, origin: 'photo' });
  });

  it('ignores nothing found and invalid finds', () => {
    expect(applyPhotoFind(NO_BARCODE, null)).toBe(NO_BARCODE);
    expect(applyPhotoFind(NO_BARCODE, '4006381333932')).toBe(NO_BARCODE);
  });

  it('never overwrites what the user entered', () => {
    const typed = applyUserEdit('4001234567891');
    expect(applyPhotoFind(typed, VALID)).toBe(typed);
  });

  it('does not bring back a code the user removed', () => {
    const cleared = applyUserEdit('');
    expect(applyPhotoFind(cleared, VALID)).toBe(cleared);
  });

  it('lets a later photo replace an earlier photo find', () => {
    const first = applyPhotoFind(NO_BARCODE, VALID);
    expect(applyPhotoFind(first, '4001234567891').code).toBe('4001234567891');
  });
});

describe('barcodeProblem and barcodeToSend', () => {
  it('has no problem while empty or valid', () => {
    expect(barcodeProblem(NO_BARCODE)).toBeNull();
    expect(barcodeProblem(applyUserEdit(VALID))).toBeNull();
    expect(barcodeToSend(applyUserEdit(VALID))).toBe(VALID);
  });

  it('reports and does not send an invalid code', () => {
    const bad = applyUserEdit('4006381333932');
    expect(barcodeProblem(bad)).toContain('ungültig');
    expect(barcodeToSend(bad)).toBeNull();
  });

  it('strips spaces and hyphens', () => {
    expect(applyUserEdit('4006 3813-33931').code).toBe(VALID);
  });
});
