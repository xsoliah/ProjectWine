import { ratingFromPointer, ratingLabel, starFill, stepRating } from './star-rating.logic';

describe('star rating logic', () => {
  it('fills whole, half and empty stars', () => {
    expect(starFill(1, 3.5)).toBe(1);
    expect(starFill(4, 3.5)).toBe(0.5);
    expect(starFill(5, 3.5)).toBe(0);
    expect(starFill(1, null)).toBe(0);
  });

  it('picks half or full star by pointer position', () => {
    expect(ratingFromPointer(3, 0.2)).toBe(2.5);
    expect(ratingFromPointer(3, 0.8)).toBe(3);
  });

  it('steps in half stars and stays within 0.5..5', () => {
    expect(stepRating(null, 1)).toBe(0.5);
    expect(stepRating(2, 1)).toBe(2.5);
    expect(stepRating(0.5, -1)).toBe(0.5);
    expect(stepRating(5, 1)).toBe(5);
  });

  it('describes the rating in German', () => {
    expect(ratingLabel(null)).toBe('Keine Bewertung');
    expect(ratingLabel(3.5)).toBe('3,5 von 5 Sternen');
  });
});
