import { LabelPoint } from './models';

/** Longest edge the model processes without further downscaling; keeps uploads mostly under 1 MB. */
export const MAX_PHOTO_EDGE = 1568;
export const PHOTO_QUALITY = 0.85;

/** Target size: at most MAX_PHOTO_EDGE on the long edge, proportions kept, never enlarged. */
export function targetSize(width: number, height: number, maxEdge = MAX_PHOTO_EDGE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Shrinks a photo in the browser before uploading: EXIF orientation applied, JPEG 0.85, long edge at most 1568 px.
 */
export async function preparePhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = targetSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas nicht verfügbar');
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Foto konnte nicht umgewandelt werden.'))), 'image/jpeg', PHOTO_QUALITY),
    );
  } finally {
    bitmap.close();
  }
}

// ----- Label corners -----

/** Suggestion when no corners are known: a frame 10 % inside every edge (same as the server). */
export const CENTERED_CORNERS: readonly LabelPoint[] = [
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.1 },
  { x: 0.9, y: 0.9 },
  { x: 0.1, y: 0.9 },
];

export const CORNER_NAMES = ['oben links', 'oben rechts', 'unten rechts', 'unten links'] as const;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** Pointer position inside the displayed image, normalized and clamped to 0..1. */
export function toNormalized(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): LabelPoint {
  return {
    x: clamp((clientX - rect.left) / rect.width),
    y: clamp((clientY - rect.top) / rect.height),
  };
}

export function toScreen(point: LabelPoint, rect: { width: number; height: number }): { x: number; y: number } {
  return { x: point.x * rect.width, y: point.y * rect.height };
}

/** Moves a point by a delta (keyboard), staying inside the image. */
export function nudge(point: LabelPoint, dx: number, dy: number): LabelPoint {
  return { x: clamp(point.x + dx), y: clamp(point.y + dy) };
}

/** Same rule as the server: inside the image, convex, clockwise (top left, top right, bottom right, bottom left), at least 2 %. */
export function cornersValid(points: readonly LabelPoint[]): boolean {
  if (points.length !== 4) return false;
  if (points.some((p) => p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)) return false;
  for (let i = 0; i < 4; i++) {
    const a = points[i];
    const b = points[(i + 1) % 4];
    const c = points[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross <= 0) return false;
  }
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const p = points[i];
    const q = points[(i + 1) % 4];
    area += p.x * q.y - q.x * p.y;
  }
  return Math.abs(area) / 2 >= 0.02;
}
