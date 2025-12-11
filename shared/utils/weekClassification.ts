/**
 * Week Classification Algorithm
 *
 * Classifies each week into one of 5 types based on workout completion,
 * nutrition adherence, and weight progress.
 */

export type WeekType = "excellent" | "good" | "inconsistent" | "bad" | "recovery";

export interface WeekClassificationInput {
  workoutsCompleted: number;
  workoutsPlanned: number;
  nutritionDaysHitTarget: number;
  weightChange: number | null;
  weightChangeTarget: number;
  isRecoveryWeek?: boolean; // Manually set for recovery weeks
  missedDays?: string[];
}

export interface WeekClassificationResult {
  weekType: WeekType;
  confidence: number; // 0.0-1.0
  reasons: string[];
  scores: {
    workoutScore: number; // 0-100
    nutritionScore: number; // 0-100
    weightScore: number | null; // 0-100 or null
    overallScore: number; // 0-100
  };
}

/**
 * Main classification function
 */
export function classifyWeek(input: WeekClassificationInput): WeekClassificationResult {
  const {
    workoutsCompleted,
    workoutsPlanned,
    nutritionDaysHitTarget,
    weightChange,
    weightChangeTarget,
    isRecoveryWeek = false,
    missedDays = [],
  } = input;

  // If manually set as recovery week, classify accordingly
  if (isRecoveryWeek) {
    return classifyRecoveryWeek(input);
  }

  // Calculate individual scores
  const workoutCompletionRate = workoutsPlanned > 0 ? workoutsCompleted / workoutsPlanned : 0;
  const workoutScore = workoutCompletionRate * 100;

  const nutritionCompletionRate = nutritionDaysHitTarget / 7;
  const nutritionScore = nutritionCompletionRate * 100;

  // Weight progress score (0-100)
  const weightScore = calculateWeightProgressScore(weightChange, weightChangeTarget);

  // Calculate overall score (weighted average)
  const overallScore = weightScore !== null
    ? (workoutScore * 0.4 + nutritionScore * 0.4 + weightScore * 0.2)
    : (workoutScore * 0.5 + nutritionScore * 0.5);

  const scores = {
    workoutScore,
    nutritionScore,
    weightScore,
    overallScore,
  };

  // Classify based on thresholds
  const reasons: string[] = [];
  let weekType: WeekType;
  let confidence: number;

  // BAD WEEK - Immediate disqualifiers
  if (workoutCompletionRate < 0.5) {
    weekType = "bad";
    confidence = 0.9;
    reasons.push(`Only completed ${Math.round(workoutCompletionRate * 100)}% of workouts`);

    if (missedDays.length >= 3) {
      reasons.push(`Missed ${missedDays.length} planned workout days`);
      confidence = 0.95;
    }

    return { weekType, confidence, reasons, scores };
  }

  if (nutritionCompletionRate < 0.5) {
    weekType = "bad";
    confidence = 0.9;
    reasons.push(`Only hit nutrition targets ${Math.round(nutritionCompletionRate * 100)}% of days`);
    return { weekType, confidence, reasons, scores };
  }

  // EXCELLENT WEEK
  if (
    workoutCompletionRate >= 0.9 &&
    nutritionCompletionRate >= 0.85 &&
    (weightScore === null || weightScore >= 80)
  ) {
    weekType = "excellent";
    confidence = 0.95;
    reasons.push(`Outstanding workout completion (${Math.round(workoutCompletionRate * 100)}%)`);
    reasons.push(`Excellent nutrition adherence (${Math.round(nutritionCompletionRate * 100)}%)`);

    if (weightScore !== null && weightScore >= 80) {
      reasons.push("Weight progress on track");
    }

    return { weekType, confidence, reasons, scores };
  }

  // GOOD WEEK
  if (
    workoutCompletionRate >= 0.7 &&
    nutritionCompletionRate >= 0.7 &&
    (weightScore === null || weightScore >= 60)
  ) {
    weekType = "good";
    confidence = 0.85;
    reasons.push(`Strong workout completion (${Math.round(workoutCompletionRate * 100)}%)`);
    reasons.push(`Good nutrition adherence (${Math.round(nutritionCompletionRate * 100)}%)`);

    if (weightScore !== null && weightScore >= 60) {
      reasons.push("Weight progress reasonable");
    }

    return { weekType, confidence, reasons, scores };
  }

  // INCONSISTENT WEEK
  if (
    workoutCompletionRate >= 0.5 &&
    nutritionCompletionRate >= 0.5
  ) {
    weekType = "inconsistent";
    confidence = 0.8;
    reasons.push(`Moderate workout completion (${Math.round(workoutCompletionRate * 100)}%)`);
    reasons.push(`Moderate nutrition adherence (${Math.round(nutritionCompletionRate * 100)}%)`);

    if (weightScore !== null && weightScore < 60) {
      reasons.push("Weight progress below target");
    }

    return { weekType, confidence, reasons, scores };
  }

  // Default to BAD if none of the above
  weekType = "bad";
  confidence = 0.75;
  reasons.push("Performance below minimum thresholds");

  return { weekType, confidence, reasons, scores };
}

/**
 * Special classification for recovery weeks
 */
function classifyRecoveryWeek(input: WeekClassificationInput): WeekClassificationResult {
  const {
    workoutsCompleted,
    workoutsPlanned,
    nutritionDaysHitTarget,
  } = input;

  // Recovery weeks have adjusted expectations
  // Success = completing 4+ workouts and 4+ nutrition days
  const recoveryWorkoutTarget = 4;
  const recoveryNutritionTarget = 4;

  const workoutScore = Math.min((workoutsCompleted / recoveryWorkoutTarget) * 100, 100);
  const nutritionScore = Math.min((nutritionDaysHitTarget / recoveryNutritionTarget) * 100, 100);
  const overallScore = (workoutScore + nutritionScore) / 2;

  const reasons: string[] = ["Recovery week with adjusted goals"];

  if (workoutsCompleted >= recoveryWorkoutTarget) {
    reasons.push(`Completed ${workoutsCompleted} workouts (recovery target: ${recoveryWorkoutTarget})`);
  } else {
    reasons.push(`Completed ${workoutsCompleted}/${recoveryWorkoutTarget} recovery workouts`);
  }

  if (nutritionDaysHitTarget >= recoveryNutritionTarget) {
    reasons.push(`Hit nutrition targets ${nutritionDaysHitTarget} days (recovery target: ${recoveryNutritionTarget})`);
  }

  const confidence = overallScore >= 75 ? 0.9 : 0.7;

  return {
    weekType: "recovery",
    confidence,
    reasons,
    scores: {
      workoutScore,
      nutritionScore,
      weightScore: null, // Weight not scored during recovery
      overallScore,
    },
  };
}

/**
 * Calculate weight progress score (0-100)
 * Returns null if weight data is insufficient
 */
function calculateWeightProgressScore(
  weightChange: number | null,
  weightChangeTarget: number
): number | null {
  if (weightChange === null || weightChangeTarget === 0) {
    return null;
  }

  // Calculate how close to target (as a percentage)
  const progressRatio = weightChange / weightChangeTarget;

  // Perfect score if within 10% of target
  if (progressRatio >= 0.9 && progressRatio <= 1.1) {
    return 100;
  }

  // Good score if within 20% of target
  if (progressRatio >= 0.8 && progressRatio <= 1.2) {
    return 80;
  }

  // Moderate score if within 30% of target
  if (progressRatio >= 0.7 && progressRatio <= 1.3) {
    return 60;
  }

  // Below target - scale linearly
  if (progressRatio < 0.7) {
    return Math.max(progressRatio * 100, 0);
  }

  // Above target - penalize but not as harshly
  if (progressRatio > 1.3) {
    // If significantly over target (e.g., gaining weight when trying to lose)
    // this could indicate an issue
    const excessRatio = progressRatio - 1.0;
    return Math.max(60 - (excessRatio * 100), 20);
  }

  return 50; // Default moderate score
}

/**
 * Helper to get human-readable week type label
 */
export function getWeekTypeLabel(weekType: WeekType): string {
  const labels: Record<WeekType, string> = {
    excellent: "Excellent Week",
    good: "Good Week",
    inconsistent: "Inconsistent Week",
    bad: "Bad Week",
    recovery: "Recovery Week",
  };
  return labels[weekType];
}

/**
 * Helper to get week type color for UI
 */
export function getWeekTypeColor(weekType: WeekType): string {
  const colors: Record<WeekType, string> = {
    excellent: "#10b981", // green
    good: "#3b82f6", // blue
    inconsistent: "#f59e0b", // amber
    bad: "#ef4444", // red
    recovery: "#8b5cf6", // purple
  };
  return colors[weekType];
}

/**
 * Helper to get week type emoji
 */
export function getWeekTypeEmoji(weekType: WeekType): string {
  const emojis: Record<WeekType, string> = {
    excellent: "🔥",
    good: "💪",
    inconsistent: "⚠️",
    bad: "😔",
    recovery: "🌱",
  };
  return emojis[weekType];
}
