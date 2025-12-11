/**
 * Program Adjustment Engine
 *
 * Makes intelligent decisions about how to modify the training program
 * based on week classification, patterns, and user performance.
 *
 * Decision Tree:
 * - Excellent Week → Progress (increase weight/reps)
 * - Good Week → Maintain or small progress
 * - Inconsistent Week → Maintain
 * - Bad Week → Recovery week next
 * - Recovery Week → Depends on success
 */

import type { WeekType } from "./weekClassification";
import type { DetectedPattern } from "./patternDetection";

export interface AdjustmentDecision {
  action: "progress" | "maintain" | "reduce" | "recovery";
  explanation: string;
  changes: ProgramChanges;
  focusMessage: string;
}

export interface ProgramChanges {
  weightAdjustment?: number; // Percentage change (e.g., 0.05 = 5% increase)
  volumeAdjustment?: number; // Percentage change in sets/reps
  frequencyAdjustment?: number; // Change in workout days per week
  intensityAdjustment?: "increase" | "maintain" | "decrease";
  addDeload?: boolean;
  extendRecovery?: boolean;
}

export interface AdjustmentContext {
  weekType: WeekType;
  previousWeekType?: WeekType;
  patterns: DetectedPattern[];
  workoutCompletionRate: number;
  nutritionConsistencyRate: number;
  avgExtraRest: number; // seconds
  avgFeeling: number; // 0.0-1.0 (Easy=1.0, Good=0.75, Hard=0.5)
  consecutiveWeeks: number; // Weeks in current program
}

/**
 * Main function: Decide how to adjust the program
 */
export function decideProgramAdjustment(context: AdjustmentContext): AdjustmentDecision {
  const { weekType, previousWeekType, patterns, avgFeeling, avgExtraRest } = context;

  // Priority 1: Recovery from bad week
  if (previousWeekType === "bad" || weekType === "bad") {
    return generateRecoveryDecision(context);
  }

  // Priority 2: Pattern-based interventions
  const patternIntervention = checkPatternInterventions(patterns);
  if (patternIntervention) {
    return patternIntervention;
  }

  // Priority 3: Standard progression based on week type
  switch (weekType) {
    case "excellent":
      return generateExcellentWeekAdjustment(context);

    case "good":
      return generateGoodWeekAdjustment(context);

    case "inconsistent":
      return generateInconsistentWeekAdjustment(context);

    case "recovery":
      return generatePostRecoveryAdjustment(context);

    default:
      return generateMaintainDecision();
  }
}

/**
 * Generate recovery decision after a bad week
 */
function generateRecoveryDecision(context: AdjustmentContext): AdjustmentDecision {
  return {
    action: "recovery",
    explanation: "Last week was challenging. Creating a recovery week with reduced volume to help you get back on track.",
    changes: {
      volumeAdjustment: -0.3, // 30% reduction in volume
      frequencyAdjustment: -2, // Drop from 6 to 4 workouts
      intensityAdjustment: "maintain",
      weightAdjustment: 0, // No weight changes
      extendRecovery: false,
    },
    focusMessage: "This week is about showing up. Lower volume, same intensity. Just rebuild the habit.",
  };
}

/**
 * Check if any patterns require immediate intervention
 */
function checkPatternInterventions(patterns: DetectedPattern[]): AdjustmentDecision | null {
  // Check for recovery struggle
  const recoveryStruggle = patterns.find((p) => p.type === "recovery_struggle");
  if (recoveryStruggle) {
    return {
      action: "reduce",
      explanation: "Recovery weeks aren't working. Need to reduce baseline difficulty.",
      changes: {
        volumeAdjustment: -0.5, // 50% reduction
        frequencyAdjustment: -3, // Drop to 3 workouts/week
        intensityAdjustment: "decrease",
        weightAdjustment: -0.1, // 10% weight reduction
        extendRecovery: true,
      },
      focusMessage: "Let's simplify everything. 3 workouts, lighter weights. Focus on feeling good.",
    };
  }

  // Check for consecutive bad weeks (3+)
  const consecutiveBad = patterns.find(
    (p) => p.type === "consecutive_bad_weeks" && p.weeksAffected >= 3
  );
  if (consecutiveBad) {
    return {
      action: "reduce",
      explanation: "Three tough weeks means the program is too aggressive. Scaling back significantly.",
      changes: {
        volumeAdjustment: -0.4,
        frequencyAdjustment: -2,
        intensityAdjustment: "decrease",
        addDeload: true,
      },
      focusMessage: "The program was too much. We're making it sustainable. Progress comes from consistency, not intensity.",
    };
  }

  // Check for slump
  const slump = patterns.find((p) => p.type === "slump" && p.severity === "high");
  if (slump) {
    return {
      action: "maintain",
      explanation: "Momentum declining. Pausing progression to stabilize performance.",
      changes: {
        weightAdjustment: 0,
        volumeAdjustment: -0.1, // Small volume reduction
        intensityAdjustment: "maintain",
        addDeload: true,
      },
      focusMessage: "Let's stabilize before pushing harder. Focus on consistency this week.",
    };
  }

  return null;
}

/**
 * Adjustment for excellent week
 */
function generateExcellentWeekAdjustment(context: AdjustmentContext): AdjustmentDecision {
  const { avgFeeling, avgExtraRest, consecutiveWeeks } = context;

  // Check if user is crushing it (feeling easy + not taking extra rest)
  const crushing = avgFeeling >= 0.8 && avgExtraRest < 10;

  // Add deload every 4 weeks even if doing well
  const needsDeload = consecutiveWeeks % 4 === 0;

  if (needsDeload) {
    return {
      action: "maintain",
      explanation: "Excellent week! But it's time for a scheduled deload to allow recovery.",
      changes: {
        volumeAdjustment: -0.2,
        weightAdjustment: -0.1,
        intensityAdjustment: "decrease",
        addDeload: true,
      },
      focusMessage: "You earned a deload week. Light weights, lower volume. Recovery is when you grow.",
    };
  }

  if (crushing) {
    return {
      action: "progress",
      explanation: "Crushing it! Weights felt easy and you're not taking extra rest. Time to level up.",
      changes: {
        weightAdjustment: 0.05, // 5% weight increase
        volumeAdjustment: 0.05, // 5% volume increase (extra set)
        intensityAdjustment: "increase",
      },
      focusMessage: "Level up! Adding 5% to your weights. You've earned this progression.",
    };
  }

  return {
    action: "progress",
    explanation: "Excellent performance. Standard progression applied.",
    changes: {
      weightAdjustment: 0.025, // 2.5% increase
      intensityAdjustment: "maintain",
    },
    focusMessage: "Solid week! Small weight increases to keep building.",
  };
}

/**
 * Adjustment for good week
 */
function generateGoodWeekAdjustment(context: AdjustmentContext): AdjustmentDecision {
  const { avgFeeling, avgExtraRest } = context;

  // If feeling hard or taking lots of extra rest, maintain
  if (avgFeeling < 0.6 || avgExtraRest > 30) {
    return {
      action: "maintain",
      explanation: "Good performance, but workouts felt challenging. Maintaining current level.",
      changes: {
        weightAdjustment: 0,
        intensityAdjustment: "maintain",
      },
      focusMessage: "Good week! Sticking with current weights to build consistency.",
    };
  }

  // Otherwise, small progression
  return {
    action: "progress",
    explanation: "Good week with manageable difficulty. Small progression.",
    changes: {
      weightAdjustment: 0.025, // 2.5%
      intensityAdjustment: "maintain",
    },
    focusMessage: "Nice work! Small weight bump to keep progressing.",
  };
}

/**
 * Adjustment for inconsistent week
 */
function generateInconsistentWeekAdjustment(context: AdjustmentContext): AdjustmentDecision {
  const { workoutCompletionRate, nutritionConsistencyRate } = context;

  if (workoutCompletionRate < 0.6) {
    return {
      action: "maintain",
      explanation: "Workouts were inconsistent. Maintaining weights to allow catching up.",
      changes: {
        weightAdjustment: 0,
        volumeAdjustment: -0.1, // Slight reduction
        intensityAdjustment: "maintain",
      },
      focusMessage: "Focus on hitting all your workouts this week. Same weights, let's build consistency.",
    };
  }

  return {
    action: "maintain",
    explanation: "Decent performance but not quite there. Maintaining to build consistency.",
    changes: {
      weightAdjustment: 0,
      intensityAdjustment: "maintain",
    },
    focusMessage: "Keep grinding. Same program, focus on completion.",
  };
}

/**
 * Adjustment after a successful recovery week
 */
function generatePostRecoveryAdjustment(context: AdjustmentContext): AdjustmentDecision {
  const { workoutCompletionRate, nutritionConsistencyRate, weekType } = context;

  // Check if recovery was successful
  const recoverySuccessful = workoutCompletionRate >= 0.66 && nutritionConsistencyRate >= 0.57; // 4/6 workouts, 4/7 days

  if (!recoverySuccessful && weekType === "bad") {
    return {
      action: "recovery",
      explanation: "Recovery week wasn't successful. Extending recovery another week.",
      changes: {
        volumeAdjustment: -0.3,
        frequencyAdjustment: -2,
        intensityAdjustment: "maintain",
        extendRecovery: true,
      },
      focusMessage: "Let's try recovery again. No rush. We'll get through this.",
    };
  }

  return {
    action: "maintain",
    explanation: "Recovery successful! Returning to regular program but maintaining weights.",
    changes: {
      weightAdjustment: 0,
      volumeAdjustment: 0.3, // Return to full volume
      frequencyAdjustment: 2, // Return to 6 workouts
      intensityAdjustment: "maintain",
    },
    focusMessage: "Welcome back! Same weights, full volume. Let's build momentum.",
  };
}

/**
 * Default maintain decision
 */
function generateMaintainDecision(): AdjustmentDecision {
  return {
    action: "maintain",
    explanation: "Maintaining current program.",
    changes: {
      weightAdjustment: 0,
      intensityAdjustment: "maintain",
    },
    focusMessage: "Keep up the good work!",
  };
}

/**
 * Apply adjustment changes to a workout program
 */
export function applyAdjustmentsToWorkout(
  workout: any,
  changes: ProgramChanges
): any {
  const adjusted = { ...workout };

  // Apply weight adjustments
  if (changes.weightAdjustment && workout.exercises) {
    adjusted.exercises = workout.exercises.map((ex: any) => {
      if (ex.weight) {
        const newWeight = ex.weight * (1 + changes.weightAdjustment!);
        return {
          ...ex,
          weight: Math.round(newWeight * 2) / 2, // Round to nearest 0.5 kg
        };
      }
      return ex;
    });
  }

  // Apply volume adjustments (sets/reps)
  if (changes.volumeAdjustment && workout.exercises) {
    adjusted.exercises = workout.exercises.map((ex: any) => {
      const volumeMod = 1 + changes.volumeAdjustment!;

      if (ex.sets) {
        return {
          ...ex,
          sets: Math.max(Math.round(ex.sets * volumeMod), 1),
        };
      }

      if (ex.rounds) {
        return {
          ...ex,
          rounds: Math.max(Math.round(ex.rounds * volumeMod), 1),
        };
      }

      return ex;
    });
  }

  return adjusted;
}

/**
 * Generate weekly focus message based on adjustment
 */
export function generateWeeklyFocusMessage(
  decision: AdjustmentDecision,
  weekType: WeekType
): string {
  return `${decision.focusMessage}\n\nLast week: ${weekType}\nThis week: ${decision.action}`;
}
