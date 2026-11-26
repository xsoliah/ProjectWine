export const MAX_STARS = 5;
export const RATING_STEP = 0.5;

/** How much of star number `index` (1-based) is filled for the given rating: 0, 0.5 or 1. */
export function starFill(index: number, rating: number | null): 0 | 0.5 | 1 {
  const value = rating ?? 0;
  if (value >= index) return 1;
  if (value >= index - RATING_STEP) return 0.5;
  return 0;
}

/** The rating chosen by pressing star `index` (1-based) at `offsetRatio` (0..1) of its width. */
export function ratingFromPointer(index: number, offsetRatio: number): number {
  return offsetRatio < 0.5 ? index - RATING_STEP : index;
}

/** Moves the rating by `steps` half-stars, staying within 0.5..5. */
export function stepRating(rating: number | null, steps: number): number {
  const next = (rating ?? 0) + steps * RATING_STEP;
  return Math.min(MAX_STARS, Math.max(RATING_STEP, next));
}

export function ratingLabel(rating: number | null): string {
  return rating === null
    ? 'Keine Bewertung'
    : `${rating.toLocaleString('de-DE')} von ${MAX_STARS} Sternen`;
}
