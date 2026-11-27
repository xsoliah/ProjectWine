export const MAX_STARS = 5;
export const RATING_STEP = 0.5;
/** Personal scale above five stars: "Top" is stored as 6, "Hammer" as 7. */
export const RATING_TOP = 6;
export const RATING_HAMMER = 7;

/** All valid ratings in ascending order: 0.5 … 5 in half steps, then Top and Hammer. */
export const RATING_LEVELS: readonly number[] = [
  ...Array.from({ length: MAX_STARS * 2 }, (_, i) => (i + 1) * RATING_STEP),
  RATING_TOP,
  RATING_HAMMER,
];

/** True for the tiers above five stars ("Top", "Hammer"), which are shown without stars. */
export function isTier(rating: number | null): boolean {
  return rating !== null && rating > MAX_STARS;
}

/** How much of star number `index` (1-based) is filled for the given rating: 0, 0.5 or 1. A tier fills all stars. */
export function starFill(index: number, rating: number | null): 0 | 0.5 | 1 {
  const value = isTier(rating) ? MAX_STARS : (rating ?? 0);
  if (value >= index) return 1;
  if (value >= index - RATING_STEP) return 0.5;
  return 0;
}

/** The rating chosen by pressing star `index` (1-based) at `offsetRatio` (0..1) of its width. */
export function ratingFromPointer(index: number, offsetRatio: number): number {
  return offsetRatio < 0.5 ? index - RATING_STEP : index;
}

/** Moves the rating by `steps` levels along 0.5 … 5, Top, Hammer, staying within the scale. */
export function stepRating(rating: number | null, steps: number): number {
  const current = rating === null ? -1 : RATING_LEVELS.indexOf(rating);
  const next = Math.min(RATING_LEVELS.length - 1, Math.max(0, current + steps));
  return RATING_LEVELS[next];
}

/** Short text of a tier or a number of stars, e.g. for tables and the pivot ("Hammer", "4,5"). */
export function ratingText(rating: number): string {
  if (rating === RATING_HAMMER) return 'Hammer';
  if (rating === RATING_TOP) return 'Top';
  return rating.toLocaleString('de-DE');
}

export function ratingLabel(rating: number | null): string {
  if (rating === null) return 'Keine Bewertung';
  if (isTier(rating)) return ratingText(rating);
  return `${rating.toLocaleString('de-DE')} von ${MAX_STARS} Sternen`;
}
