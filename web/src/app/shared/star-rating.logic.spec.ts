import {
  RATING_HAMMER,
  RATING_TOP,
  isTier,
  ratingFromPointer,
  ratingLabel,
  ratingText,
  starFill,
  stepRating,
} from './star-rating.logic';

describe('star rating logic', () => {
  it('fills whole, half and empty stars', () => {
    expect(starFill(1, 3.5)).toBe(1);
    expect(starFill(4, 3.5)).toBe(0.5);
    expect(starFill(5, 3.5)).toBe(0);
    expect(starFill(1, null)).toBe(0);
  });

  it('fills all stars for Top and Hammer', () => {
    expect(starFill(5, RATING_TOP)).toBe(1);
    expect(starFill(5, RATING_HAMMER)).toBe(1);
  });

  it('picks half or full star by pointer position', () => {
    expect(ratingFromPointer(3, 0.2)).toBe(2.5);
    expect(ratingFromPointer(3, 0.8)).toBe(3);
  });

  it('steps in half stars and stays within 0.5..Hammer', () => {
    expect(stepRating(null, 1)).toBe(0.5);
    expect(stepRating(2, 1)).toBe(2.5);
    expect(stepRating(0.5, -1)).toBe(0.5);
    expect(stepRating(RATING_HAMMER, 1)).toBe(RATING_HAMMER);
  });

  it('steps from five stars to Top to Hammer and back', () => {
    expect(stepRating(5, 1)).toBe(RATING_TOP);
    expect(stepRating(RATING_TOP, 1)).toBe(RATING_HAMMER);
    expect(stepRating(RATING_HAMMER, -1)).toBe(RATING_TOP);
    expect(stepRating(RATING_TOP, -1)).toBe(5);
  });

  it('recognises the tiers above five stars', () => {
    expect(isTier(RATING_TOP)).toBe(true);
    expect(isTier(RATING_HAMMER)).toBe(true);
    expect(isTier(5)).toBe(false);
    expect(isTier(null)).toBe(false);
  });

  it('describes the rating in German', () => {
    expect(ratingLabel(null)).toBe('Keine Bewertung');
    expect(ratingLabel(3.5)).toBe('3,5 von 5 Sternen');
    expect(ratingLabel(RATING_TOP)).toBe('Top');
    expect(ratingLabel(RATING_HAMMER)).toBe('Hammer');
  });

  it('gives a short text for tables and the pivot', () => {
    expect(ratingText(4.5)).toBe('4,5');
    expect(ratingText(RATING_TOP)).toBe('Top');
    expect(ratingText(RATING_HAMMER)).toBe('Hammer');
  });
});
