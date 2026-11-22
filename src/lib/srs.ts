/**
 * Spaced Repetition System (SRS) based on SM-2 Algorithm
 */

export type SRSRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface SRSInput {
  srsStep: number;
  srsEaseFactor: number;
  srsInterval: number;
  rating: SRSRating;
}

export interface SRSOutput {
  nextStep: number;
  nextInterval: number; // in days
  nextEaseFactor: number;
  nextReviewDate: Date;
  status: 'NOT_LEARNED' | 'LEARNING' | 'MASTERED';
}

export function calculateSRS({
  srsStep,
  srsEaseFactor,
  srsInterval,
  rating,
}: SRSInput): SRSOutput {
  let nextStep = srsStep;
  let nextInterval = srsInterval;
  let nextEaseFactor = srsEaseFactor;

  // Grade scale: AGAIN = 1, HARD = 2, GOOD = 4, EASY = 5
  let grade = 4;
  if (rating === 'AGAIN') grade = 1;
  else if (rating === 'HARD') grade = 2;
  else if (rating === 'GOOD') grade = 4;
  else if (rating === 'EASY') grade = 5;

  // Update ease factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  nextEaseFactor = Math.max(
    1.3,
    nextEaseFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  );

  if (rating === 'AGAIN') {
    nextStep = 0;
    nextInterval = 1; // Review again tomorrow
  } else if (rating === 'HARD') {
    nextStep = Math.max(1, nextStep);
    nextInterval = Math.max(1, Math.round(nextInterval * 1.2));
    if (nextInterval === srsInterval) nextInterval += 1;
  } else if (rating === 'GOOD') {
    nextStep += 1;
    if (nextStep === 1) {
      nextInterval = 1;
    } else if (nextStep === 2) {
      nextInterval = 3;
    } else if (nextStep === 3) {
      nextInterval = 7;
    } else {
      nextInterval = Math.round(nextInterval * nextEaseFactor);
    }
  } else if (rating === 'EASY') {
    nextStep += 2;
    if (nextStep <= 2) {
      nextInterval = 4;
    } else {
      nextInterval = Math.round(nextInterval * nextEaseFactor * 1.3);
    }
  }

  // Ensure minimum interval is at least 1 day
  if (nextInterval < 1) nextInterval = 1;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
  // Set to start of day
  nextReviewDate.setHours(4, 0, 0, 0);

  // Status computation
  let status: 'NOT_LEARNED' | 'LEARNING' | 'MASTERED' = 'LEARNING';
  if (nextStep >= 3 || nextInterval >= 7) {
    status = 'MASTERED';
  } else if (nextStep === 0 && rating === 'AGAIN') {
    status = 'LEARNING';
  }

  return {
    nextStep,
    nextInterval,
    nextEaseFactor: Number(nextEaseFactor.toFixed(2)),
    nextReviewDate,
    status,
  };
}
