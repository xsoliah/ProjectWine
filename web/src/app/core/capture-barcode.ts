import { cleanGtin, isValidGtin } from './barcode-image-reader';

/** Where the barcode of the capture form currently comes from. */
export type BarcodeOrigin = 'none' | 'photo' | 'user';

export interface BarcodeState {
  code: string;
  origin: BarcodeOrigin;
}

export const NO_BARCODE: BarcodeState = { code: '', origin: 'none' };

/**
 * A barcode found on a photo. It only fills the field when the user has not typed, scanned, changed or removed a
 * code (the user's value is never overwritten) and when the code is valid.
 */
export function applyPhotoFind(state: BarcodeState, found: string | null): BarcodeState {
  if (state.origin === 'user' || !found) return state;
  const code = cleanGtin(found);
  return isValidGtin(code) ? { code, origin: 'photo' } : state;
}

/** The user typed, scanned or cleared the field. */
export function applyUserEdit(raw: string): BarcodeState {
  const code = cleanGtin(raw);
  // Clearing counts as a decision too: a later photo must not bring the code back.
  return { code, origin: 'user' };
}

/** Message for the field, or null while it is empty or valid. */
export function barcodeProblem(state: BarcodeState): string | null {
  if (state.code === '') return null;
  return isValidGtin(state.code)
    ? null
    : 'Dieser Barcode ist ungültig (8, 12, 13 oder 14 Ziffern, Prüfziffer muss stimmen).';
}

/** The code to send with the capture: only valid ones. */
export function barcodeToSend(state: BarcodeState): string | null {
  return isValidGtin(state.code) ? state.code : null;
}
