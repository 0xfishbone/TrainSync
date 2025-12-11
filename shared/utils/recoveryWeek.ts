/**
 * Recovery Week Generation Logic
 *
 * Creates simplified workout programs for recovery weeks following bad weeks.
 * Philosophy:
 * - Reduce volume/frequency to make success easier
 * - Pause progression - no weight increases
 * - No new exercises
 * - Focus on rebuilding momentum, not performance
 */

export interface RecoveryWeekConfig {
  targetWorkouts: number; // Reduced from usual (e.g., 4 instead of 6)
  targetNutritionDays: number; // Reduced from 7 (e.g., 4 - one meal/day)
  pauseProgression: boolean; // Always true for recovery
  simplifyWorkouts: boolean; // Remove accessory work
  maintainWeights: boolean; // Keep same weights as last week
  focusMessage: string; // Encouraging message
}

export interface WorkoutTemplate {
  name: string;
  type: string;
  exercises: ExerciseTemplate[];
}

export interface ExerciseTemplate {
  name: string;
  type: "reps" | "timed";
  sets?: number;
  reps?: number;
  weight?: number;
  rounds?: number;
  workTime?: number;
  restTime?: number;
}

/**
 * Get default recovery week configuration
 */
export function getRecoveryWeekConfig(): RecoveryWeekConfig {
  return {
    targetWorkouts: 4, // Down from typical 6
    targetNutritionDays: 4, // One meal logged per day minimum
    pauseProgression: true,
    simplifyWorkouts: true,
    maintainWeights: true,
    focusMessage: "This week is about getting back on track. Lower volume, same intensity. Just show up.",
  };
}

/**
 * Generate a recovery week program from a previous week's program
 */
export function generateRecoveryWeekProgram(
  previousWeekWorkouts: Record<string, any>,
  userContext: {
    primaryGoal: string;
    trainingDaysPerWeek: number;
    sessionDuration: number;
  }
): {
  workouts: Record<string, any>;
  weeklyFocus: string;
  nutritionGuidance: string;
  recoveryNotes: string;
} {
  const config = getRecoveryWeekConfig();

  // Select 4 key workouts from previous week (prioritize compound movements)
  const previousWorkouts = Object.entries(previousWeekWorkouts);
  const selectedWorkouts = selectRecoveryWorkouts(previousWorkouts, config.targetWorkouts);

  // Simplify each workout
  const recoveryWorkouts: Record<string, any> = {};

  selectedWorkouts.forEach(([day, workout], index) => {
    const simplifiedWorkout = simplifyWorkout(workout, {
      removeAccessories: config.simplifyWorkouts,
      maintainWeights: config.maintainWeights,
      reduceSets: true,
    });

    // Use simple day labels: "Workout 1", "Workout 2", etc.
    recoveryWorkouts[`workout_${index + 1}`] = {
      ...simplifiedWorkout,
      dayOfWeek: getRecoveryDaySchedule(index, config.targetWorkouts),
      isRecoveryWorkout: true,
    };
  });

  const weeklyFocus = generateRecoveryFocus(userContext.primaryGoal);
  const nutritionGuidance = generateRecoveryNutritionGuidance();

  return {
    workouts: recoveryWorkouts,
    weeklyFocus,
    nutritionGuidance,
    recoveryNotes: config.focusMessage,
  };
}

/**
 * Select the most important workouts for recovery week
 * Prioritizes:
 * 1. Full-body or compound movement days
 * 2. Primary goal-aligned workouts
 * 3. Workouts user actually completed last time
 */
function selectRecoveryWorkouts(
  workouts: [string, any][],
  targetCount: number
): [string, any][] {
  // Score each workout by importance
  const scoredWorkouts = workouts.map(([day, workout]) => {
    let score = 0;

    // Prioritize strength/compound movements
    if (workout.type?.includes("strength")) score += 10;
    if (workout.type?.includes("compound")) score += 8;
    if (workout.type?.includes("full_body")) score += 7;

    // Count compound exercises
    const compoundExercises = workout.exercises?.filter((ex: any) =>
      isCompoundExercise(ex.name)
    ).length || 0;
    score += compoundExercises * 2;

    return { day, workout, score };
  });

  // Sort by score and take top N
  scoredWorkouts.sort((a, b) => b.score - a.score);

  return scoredWorkouts.slice(0, targetCount).map(({ day, workout }) => [day, workout]);
}

/**
 * Check if an exercise is a compound movement
 */
function isCompoundExercise(exerciseName: string): boolean {
  const compoundKeywords = [
    "squat",
    "deadlift",
    "bench",
    "press",
    "row",
    "pull-up",
    "chin-up",
    "lunge",
    "clean",
    "snatch",
  ];

  const nameLower = exerciseName.toLowerCase();
  return compoundKeywords.some((keyword) => nameLower.includes(keyword));
}

/**
 * Simplify a workout for recovery
 */
function simplifyWorkout(
  workout: any,
  options: {
    removeAccessories: boolean;
    maintainWeights: boolean;
    reduceSets: boolean;
  }
): any {
  const { removeAccessories, maintainWeights, reduceSets } = options;

  let exercises = [...(workout.exercises || [])];

  // Remove accessory work if requested
  if (removeAccessories) {
    // Keep only compound movements
    exercises = exercises.filter((ex: any) => isCompoundExercise(ex.name));

    // If we removed everything, keep the first 3 exercises
    if (exercises.length === 0) {
      exercises = workout.exercises.slice(0, 3);
    }
  }

  // Reduce sets
  if (reduceSets) {
    exercises = exercises.map((ex: any) => ({
      ...ex,
      sets: ex.sets ? Math.max(Math.ceil(ex.sets * 0.7), 2) : ex.sets, // 70% of sets, min 2
      rounds: ex.rounds ? Math.max(Math.ceil(ex.rounds * 0.7), 2) : ex.rounds,
    }));
  }

  // Maintain weights (don't progress)
  // Weights are already set from previous week, so just keep them

  return {
    ...workout,
    exercises,
    notes: "Recovery week - reduced volume, same weights",
  };
}

/**
 * Get recommended day schedule for recovery workouts
 * Spreads 4 workouts across the week with rest days
 */
function getRecoveryDaySchedule(workoutIndex: number, totalWorkouts: number): string {
  // For 4 workouts: Monday, Wednesday, Friday, Sunday
  const schedules: Record<number, string[]> = {
    4: ["Monday", "Wednesday", "Friday", "Sunday"],
    3: ["Monday", "Wednesday", "Saturday"],
    5: ["Monday", "Tuesday", "Thursday", "Friday", "Sunday"],
  };

  const schedule = schedules[totalWorkouts] || schedules[4];
  return schedule[workoutIndex] || "Monday";
}

/**
 * Generate recovery-focused messaging
 */
function generateRecoveryFocus(primaryGoal: string): string {
  const focusMessages: Record<string, string> = {
    strength: "Maintain strength with lower volume. Focus on perfect form and showing up.",
    cardio: "Keep moving, but don't chase PR's. Rebuild your aerobic base.",
    weight_gain: "Hit your protein and keep lifting. Gains happen when you're consistent.",
    weight_loss: "One meal logged per day. Show up for your workouts. That's enough.",
  };

  return focusMessages[primaryGoal] || "Focus on consistency. Volume is lower to help you rebuild momentum.";
}

/**
 * Generate recovery nutrition guidance
 */
function generateRecoveryNutritionGuidance(): string {
  return "Log ONE meal per day minimum. We're not aiming for perfection - just staying connected to your nutrition. Pick your easiest meal (breakfast works great) and make it a habit.";
}

/**
 * Determine if a recovery week is needed based on week classification
 */
export function shouldGenerateRecoveryWeek(
  weekType: "excellent" | "good" | "inconsistent" | "bad" | "recovery",
  previousWeekType?: "excellent" | "good" | "inconsistent" | "bad" | "recovery"
): boolean {
  // Generate recovery week after a bad week
  if (previousWeekType === "bad") {
    return true;
  }

  // If already in recovery and still having a bad week, extend recovery
  if (weekType === "bad" && previousWeekType === "recovery") {
    return true;
  }

  return false;
}

/**
 * Calculate recovery week success
 * Returns true if user successfully completed the recovery week
 */
export function evaluateRecoverySuccess(
  workoutsCompleted: number,
  nutritionDaysHitTarget: number
): {
  successful: boolean;
  message: string;
  nextStepRecommendation: string;
} {
  const config = getRecoveryWeekConfig();

  const workoutSuccess = workoutsCompleted >= config.targetWorkouts;
  const nutritionSuccess = nutritionDaysHitTarget >= config.targetNutritionDays;

  const successful = workoutSuccess && nutritionSuccess;

  let message: string;
  let nextStepRecommendation: string;

  if (successful) {
    message = `Great job! You completed ${workoutsCompleted}/${config.targetWorkouts} workouts and hit nutrition ${nutritionDaysHitTarget}/${config.targetNutritionDays} days.`;
    nextStepRecommendation = "You're ready to return to your normal program with progression.";
  } else if (workoutSuccess && !nutritionSuccess) {
    message = "Good workout consistency, but nutrition needs attention.";
    nextStepRecommendation = "Continue with recovery goals for one more week, focusing on nutrition.";
  } else if (!workoutSuccess && nutritionSuccess) {
    message = "Nutrition is on track, but workouts need more consistency.";
    nextStepRecommendation = "Continue with recovery goals for one more week, focusing on showing up.";
  } else {
    message = "This week was still challenging. That's okay.";
    nextStepRecommendation = "Let's extend recovery another week. We'll get through this together.";
  }

  return {
    successful,
    message,
    nextStepRecommendation,
  };
}
