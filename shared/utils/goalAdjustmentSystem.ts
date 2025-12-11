/**
 * Goal Adjustment System
 *
 * Automatically detects when goal adjustments are needed and generates
 * AI-suggested new goals based on actual performance patterns.
 *
 * Triggers:
 * - 3+ weeks off-track (goal drift pattern)
 * - 3+ consecutive bad weeks
 * - Recovery struggle pattern detected
 * - Sustained slump (4+ weeks declining)
 *
 * Philosophy:
 * - Goals should be challenging but achievable
 * - Adjust to reality, not ideal
 * - Better to succeed at a smaller goal than fail at an ambitious one
 */

import type { DetectedPattern } from "./patternDetection";
import type { GoalProgress } from "./goalTracking";

export interface GoalAdjustmentTrigger {
  shouldTrigger: boolean;
  triggerType: "ai_suggestion" | "pattern_detected" | "user_initiated";
  triggerReason: string;
  weeksOffTrack: number;
  suggestedGoal: SuggestedGoal;
  confidence: number; // 0.0-1.0
}

export interface SuggestedGoal {
  targetWeightMin: number;
  targetWeightMax: number;
  weeklyRate: number;
  reasoning: string;
  adjustmentType: "easier" | "harder" | "maintain_target_slower_pace";
}

export interface GoalAdjustmentInput {
  currentGoal: {
    goalStartWeight: number;
    goalStartDate: Date;
    targetWeightMin: number;
    targetWeightMax: number;
    goalWeeklyRate: number;
  };
  currentProgress: GoalProgress;
  patterns: DetectedPattern[];
  actualWeeklyRate: number | null; // Calculated from weigh-ins
  weeksIntoGoal: number;
}

/**
 * Main function: Determine if goal adjustment should be suggested
 */
export function checkGoalAdjustmentNeeded(input: GoalAdjustmentInput): GoalAdjustmentTrigger {
  const { currentGoal, currentProgress, patterns, actualWeeklyRate, weeksIntoGoal } = input;

  // Default: no trigger
  const noTrigger: GoalAdjustmentTrigger = {
    shouldTrigger: false,
    triggerType: "ai_suggestion",
    triggerReason: "",
    weeksOffTrack: 0,
    suggestedGoal: {
      targetWeightMin: currentGoal.targetWeightMin,
      targetWeightMax: currentGoal.targetWeightMax,
      weeklyRate: currentGoal.goalWeeklyRate,
      reasoning: "",
      adjustmentType: "maintain_target_slower_pace",
    },
    confidence: 0,
  };

  // Require at least 3 weeks of data
  if (weeksIntoGoal < 3) {
    return noTrigger;
  }

  // Priority 1: Goal drift (consistently missing weight targets)
  const goalDriftPattern = patterns.find((p) => p.type === "goal_drift");
  if (goalDriftPattern && goalDriftPattern.severity === "high") {
    return generateGoalDriftAdjustment(input, goalDriftPattern);
  }

  // Priority 2: Consecutive bad weeks (3+)
  const consecutiveBadWeeks = patterns.find(
    (p) => p.type === "consecutive_bad_weeks" && p.weeksAffected >= 3
  );
  if (consecutiveBadWeeks) {
    return generateConsecutiveBadWeeksAdjustment(input, consecutiveBadWeeks);
  }

  // Priority 3: Recovery struggle
  const recoveryStruggle = patterns.find((p) => p.type === "recovery_struggle");
  if (recoveryStruggle) {
    return generateRecoveryStruggleAdjustment(input, recoveryStruggle);
  }

  // Priority 4: Sustained slump
  const slump = patterns.find((p) => p.type === "slump" && p.severity === "high");
  if (slump) {
    return generateSlumpAdjustment(input, slump);
  }

  // Priority 5: Off-track status for 3+ weeks
  if (
    (currentProgress.status === "off_track" || currentProgress.status === "behind") &&
    weeksIntoGoal >= 3
  ) {
    return generateOffTrackAdjustment(input);
  }

  return noTrigger;
}

/**
 * Generate adjustment for goal drift pattern
 */
function generateGoalDriftAdjustment(
  input: GoalAdjustmentInput,
  pattern: DetectedPattern
): GoalAdjustmentTrigger {
  const { currentGoal, actualWeeklyRate } = input;

  if (!actualWeeklyRate) {
    // Not enough weight data
    return {
      shouldTrigger: false,
      triggerType: "pattern_detected",
      triggerReason: "",
      weeksOffTrack: 0,
      suggestedGoal: {
        targetWeightMin: currentGoal.targetWeightMin,
        targetWeightMax: currentGoal.targetWeightMax,
        weeklyRate: currentGoal.goalWeeklyRate,
        reasoning: "",
        adjustmentType: "maintain_target_slower_pace",
      },
      confidence: 0,
    };
  }

  // Calculate more realistic goal based on actual rate
  // Use 75% of actual rate as conservative estimate
  const suggestedRate = actualWeeklyRate * 0.75;
  const isGaining = currentGoal.goalWeeklyRate > 0;

  // Keep same target, adjust pace
  const reasoning = `Your weight has been changing at ${Math.abs(actualWeeklyRate).toFixed(1)}kg/week instead of the target ${Math.abs(currentGoal.goalWeeklyRate).toFixed(1)}kg/week. Let's adjust the pace to match reality while keeping the same target.`;

  return {
    shouldTrigger: true,
    triggerType: "pattern_detected",
    triggerReason: pattern.description,
    weeksOffTrack: pattern.weeksAffected,
    suggestedGoal: {
      targetWeightMin: currentGoal.targetWeightMin,
      targetWeightMax: currentGoal.targetWeightMax,
      weeklyRate: suggestedRate,
      reasoning,
      adjustmentType: "maintain_target_slower_pace",
    },
    confidence: 0.85,
  };
}

/**
 * Generate adjustment for consecutive bad weeks
 */
function generateConsecutiveBadWeeksAdjustment(
  input: GoalAdjustmentInput,
  pattern: DetectedPattern
): GoalAdjustmentTrigger {
  const { currentGoal, currentProgress } = input;

  const isGaining = currentGoal.goalWeeklyRate > 0;

  // Reduce pace by 40% to make it more achievable
  const suggestedRate = currentGoal.goalWeeklyRate * 0.6;

  // Also move target closer if currently far away
  const currentWeight = currentProgress.currentWeight;
  const targetMid = (currentGoal.targetWeightMin + currentGoal.targetWeightMax) / 2;
  const remainingChange = targetMid - currentWeight;

  // Make target 60% of remaining distance
  const newTargetMid = currentWeight + remainingChange * 0.6;
  const targetRange = (currentGoal.targetWeightMax - currentGoal.targetWeightMin) / 2;

  const reasoning = `You've had ${pattern.weeksAffected} tough weeks in a row. The current goal might be too aggressive. Let's make it more achievable by reducing both the pace and bringing the target closer.`;

  return {
    shouldTrigger: true,
    triggerType: "pattern_detected",
    triggerReason: pattern.description,
    weeksOffTrack: pattern.weeksAffected,
    suggestedGoal: {
      targetWeightMin: newTargetMid - targetRange,
      targetWeightMax: newTargetMid + targetRange,
      weeklyRate: suggestedRate,
      reasoning,
      adjustmentType: "easier",
    },
    confidence: 0.9,
  };
}

/**
 * Generate adjustment for recovery struggle
 */
function generateRecoveryStruggleAdjustment(
  input: GoalAdjustmentInput,
  pattern: DetectedPattern
): GoalAdjustmentTrigger {
  const { currentGoal, currentProgress } = input;

  // Struggling with recovery weeks means baseline is too hard
  // Cut pace in half and move target much closer
  const suggestedRate = currentGoal.goalWeeklyRate * 0.5;

  const currentWeight = currentProgress.currentWeight;
  const targetMid = (currentGoal.targetWeightMin + currentGoal.targetWeightMax) / 2;
  const remainingChange = targetMid - currentWeight;

  // Only go 40% of remaining distance
  const newTargetMid = currentWeight + remainingChange * 0.4;
  const targetRange = Math.abs(remainingChange * 0.1); // Smaller range

  const reasoning = `You're struggling even during recovery weeks. We need to significantly reduce the intensity. Let's cut the pace in half and set a closer, more achievable target.`;

  return {
    shouldTrigger: true,
    triggerType: "pattern_detected",
    triggerReason: pattern.description,
    weeksOffTrack: pattern.weeksAffected,
    suggestedGoal: {
      targetWeightMin: Math.min(newTargetMid - targetRange, newTargetMid + targetRange),
      targetWeightMax: Math.max(newTargetMid - targetRange, newTargetMid + targetRange),
      weeklyRate: suggestedRate,
      reasoning,
      adjustmentType: "easier",
    },
    confidence: 0.95,
  };
}

/**
 * Generate adjustment for sustained slump
 */
function generateSlumpAdjustment(
  input: GoalAdjustmentInput,
  pattern: DetectedPattern
): GoalAdjustmentTrigger {
  const { currentGoal, currentProgress } = input;

  // Reduce pace by 30%
  const suggestedRate = currentGoal.goalWeeklyRate * 0.7;

  const reasoning = `Your momentum has been declining over the past month. Let's slow the pace a bit to help you rebuild consistency and confidence.`;

  return {
    shouldTrigger: true,
    triggerType: "pattern_detected",
    triggerReason: pattern.description,
    weeksOffTrack: pattern.weeksAffected,
    suggestedGoal: {
      targetWeightMin: currentGoal.targetWeightMin,
      targetWeightMax: currentGoal.targetWeightMax,
      weeklyRate: suggestedRate,
      reasoning,
      adjustmentType: "maintain_target_slower_pace",
    },
    confidence: 0.75,
  };
}

/**
 * Generate adjustment for generic off-track status
 */
function generateOffTrackAdjustment(input: GoalAdjustmentInput): GoalAdjustmentTrigger {
  const { currentGoal, currentProgress, actualWeeklyRate } = input;

  if (!actualWeeklyRate) {
    // Not enough weight data
    return {
      shouldTrigger: false,
      triggerType: "ai_suggestion",
      triggerReason: "",
      weeksOffTrack: 0,
      suggestedGoal: {
        targetWeightMin: currentGoal.targetWeightMin,
        targetWeightMax: currentGoal.targetWeightMax,
        weeklyRate: currentGoal.goalWeeklyRate,
        reasoning: "",
        adjustmentType: "maintain_target_slower_pace",
      },
      confidence: 0,
    };
  }

  // Use actual rate as suggested rate (what's actually happening)
  const suggestedRate = actualWeeklyRate;

  const reasoning = `You've been off-track for a few weeks. Your actual pace is ${Math.abs(actualWeeklyRate).toFixed(1)}kg/week. Let's adjust the goal to match your current reality.`;

  return {
    shouldTrigger: true,
    triggerType: "ai_suggestion",
    triggerReason: `Off-track for ${input.weeksIntoGoal} weeks`,
    weeksOffTrack: input.weeksIntoGoal,
    suggestedGoal: {
      targetWeightMin: currentGoal.targetWeightMin,
      targetWeightMax: currentGoal.targetWeightMax,
      weeklyRate: suggestedRate,
      reasoning,
      adjustmentType: "maintain_target_slower_pace",
    },
    confidence: 0.7,
  };
}

/**
 * Format goal adjustment for user display
 */
export function formatGoalAdjustmentMessage(trigger: GoalAdjustmentTrigger): string {
  if (!trigger.shouldTrigger) {
    return "";
  }

  const { suggestedGoal, weeksOffTrack } = trigger;
  const isGaining = suggestedGoal.weeklyRate > 0;
  const direction = isGaining ? "gain" : "loss";

  return `After ${weeksOffTrack} weeks, we suggest adjusting your goal:\n\nNew target: ${suggestedGoal.targetWeightMin.toFixed(1)}-${suggestedGoal.targetWeightMax.toFixed(1)}kg\nNew pace: ${Math.abs(suggestedGoal.weeklyRate).toFixed(1)}kg/week ${direction}\n\n${suggestedGoal.reasoning}`;
}

/**
 * Helper: Calculate weeks into goal
 */
export function calculateWeeksIntoGoal(goalStartDate: Date): number {
  const now = new Date();
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor((now.getTime() - goalStartDate.getTime()) / msPerWeek);
}
