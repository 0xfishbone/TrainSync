/**
 * Momentum Score Calculation
 *
 * A 0-100 score representing user consistency and adherence to their program.
 * Higher scores indicate better engagement and consistency.
 *
 * Scoring breakdown:
 * - Workout completion: 40 points
 * - Nutrition tracking: 30 points
 * - Goal adherence: 20 points
 * - Consistency streak: 10 points
 */

interface MomentumInput {
  // Workouts (last 7 days)
  workoutsCompleted: number;
  workoutsScheduled: number;

  // Nutrition (last 7 days)
  mealsLogged: number;
  targetMealsPerDay: number; // Usually 3-4

  // Goals
  weeklyWeightChange: number; // Actual change
  targetWeightChange: number; // Goal change
  averageCalorieDeviation: number; // Average deviation from target (0-1 ratio)

  // Streak
  currentStreak: number; // Days with activity
}

export function calculateMomentumScore(input: MomentumInput): number {
  let score = 0;

  // 1. Workout Completion (40 points max)
  // ONLY award points if workouts have been completed
  if (input.workoutsCompleted > 0 && input.workoutsScheduled > 0) {
    const workoutRate = input.workoutsCompleted / input.workoutsScheduled;
    score += Math.min(workoutRate * 40, 40);
  }

  // 2. Nutrition Tracking (30 points max)
  // ONLY award points if meals have been logged
  if (input.mealsLogged > 0) {
    const expectedMeals = 7 * input.targetMealsPerDay;
    const nutritionRate = expectedMeals > 0
      ? input.mealsLogged / expectedMeals
      : 0;
    score += Math.min(nutritionRate * 30, 30);
  }

  // 3. Goal Adherence (20 points max)
  // ONLY award points if there's actual tracking data
  let goalScore = 0;

  // Weight tracking: need actual weight change data (not zero)
  if (input.weeklyWeightChange !== 0 || input.mealsLogged > 0) {
    // How close is actual weight change to target?
    const weightDifference = Math.abs(input.weeklyWeightChange - input.targetWeightChange);
    const weightAdherence = Math.max(0, 1 - weightDifference / 2); // Allow 2kg variance

    // How close are calories to target?
    const calorieAdherence = input.mealsLogged > 0
      ? Math.max(0, 1 - input.averageCalorieDeviation)
      : 0;

    goalScore = (weightAdherence * 0.6 + calorieAdherence * 0.4) * 20;
    score += goalScore;
  }

  // 4. Consistency Streak (10 points max)
  // ONLY award points if there's an active streak
  if (input.currentStreak >= 1) {
    // Full points at 7+ day streak, scaling down
    const streakScore = Math.min(input.currentStreak / 7, 1) * 10;
    score += streakScore;
  }

  return Math.round(Math.min(Math.max(score, 0), 100));
}

/**
 * Get momentum score tier and message
 */
export function getMomentumTier(score: number): {
  tier: "fire" | "strong" | "good" | "building" | "start";
  emoji: string;
  message: string;
  color: string;
} {
  if (score >= 85) {
    return {
      tier: "fire",
      emoji: "🔥",
      message: "On fire! Incredible consistency",
      color: "#ef4444", // red
    };
  } else if (score >= 70) {
    return {
      tier: "strong",
      emoji: "💪",
      message: "Going strong! Keep it up",
      color: "#f59e0b", // amber
    };
  } else if (score >= 50) {
    return {
      tier: "good",
      emoji: "👍",
      message: "Good progress! Stay consistent",
      color: "#3b82f6", // blue
    };
  } else if (score >= 30) {
    return {
      tier: "building",
      emoji: "📈",
      message: "Building momentum...",
      color: "#8b5cf6", // purple
    };
  } else {
    return {
      tier: "start",
      emoji: "🌱",
      message: "Let's get started!",
      color: "#10b981", // green
    };
  }
}

/**
 * Calculate current streak from workout and meal data
 */
export function calculateStreak(activityDates: Date[]): number {
  if (activityDates.length === 0) return 0;

  // Sort dates in descending order
  const sorted = activityDates
    .map(d => new Date(d).setHours(0, 0, 0, 0))
    .sort((a, b) => b - a);

  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 24 * 60 * 60 * 1000;

  // Check if most recent activity was today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) {
    return 0; // Streak broken
  }

  let streak = 0;
  let currentDate = today;

  for (const activityDate of sorted) {
    if (activityDate === currentDate || activityDate === currentDate - 24 * 60 * 60 * 1000) {
      streak++;
      currentDate = activityDate - 24 * 60 * 60 * 1000;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get recommended action based on momentum score components
 */
export function getRecommendedAction(input: MomentumInput): string {
  const workoutRate = input.workoutsScheduled > 0
    ? input.workoutsCompleted / input.workoutsScheduled
    : 0;

  const expectedMeals = 7 * input.targetMealsPerDay;
  const nutritionRate = expectedMeals > 0
    ? input.mealsLogged / expectedMeals
    : 0;

  // Identify weakest area
  if (workoutRate < 0.5 && workoutRate < nutritionRate) {
    return "Focus on completing your scheduled workouts";
  } else if (nutritionRate < 0.5) {
    return "Try to log your meals more consistently";
  } else if (input.currentStreak < 3) {
    return "Build a consistent daily habit";
  } else {
    return "Keep up the great work!";
  }
}
