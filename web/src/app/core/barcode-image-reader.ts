import { targetSize } from './photo';

/** Longest edge used for decoding: large enough for thin bars, small enough for phones. */
export const MAX_DECODE_EDGE = 2500;

/** EAN-8, UPC-A, EAN-13 or GTIN-14 without spaces and hyphens. */
export function cleanGtin(raw: string): string {
  return raw.replace(/[\s-]/g, '');
}

/** GS1 check digit (modulo 10); the same rule as the server. */
export function isValidGtin(code: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < code.length - 1; i++) {
    sum += (code.charCodeAt(code.length - 2 - i) - 48) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === code.charCodeAt(code.length - 1) - 48;
}

/**
 * Looks for a barcode on a photo (the original file, before it is shrunk for the upload).
 * Resolves the code when found and valid, otherwise null; never throws.
 */
export async function readBarcodeFromImage(file: Blob): Promise<string | null> {
  let bitmap: ImageBitmap | null = null;
  try {
    const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ]);
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const hints = new Map<number, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
      [DecodeHintType.TRY_HARDER, true],
    ]);
    const reader = new BrowserMultiFormatReader(hints as Map<never, never>);
    for (const edge of [MAX_DECODE_EDGE, 1400]) {
      const { width, height } = targetSize(bitmap.width, bitmap.height, edge);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
      try {
        const code = cleanGtin(reader.decodeFromCanvas(canvas).getText());
        if (isValidGtin(code)) return code;
      } catch {
        // Nothing found at this size: try the next one.
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}
