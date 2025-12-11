/**
 * Goal Tracking Utilities
 *
 * Functions for calculating goal progress, timeline estimates,
 * and determining if user is on track.
 */

export interface GoalProgress {
  totalChange: number; // Total change needed (target - start)
  currentChange: number; // Current change achieved (current - start)
  progressPercent: number; // 0-100 percentage of goal completed
  remainingChange: number; // How much more to go
  weeksElapsed: number; // Weeks since goal started
  weeksRemaining: number | null; // Estimated weeks to completion
  estimatedCompletion: Date | null; // Estimated completion date
  isOnTrack: boolean; // Whether user is meeting weekly target
  status: "ahead" | "on_track" | "behind" | "off_track" | "goal_reached";
  daysToGoal: number | null; // Days until estimated completion
}

export interface GoalTrackingInput {
  goalStartWeight: number;
  goalStartDate: Date;
  currentWeight: number;
  targetWeightMin: number;
  targetWeightMax: number;
  goalWeeklyRate: number; // kg per week (positive for gain, negative for loss)
  actualWeeklyRate?: number | null; // Calculated from recent weigh-ins
  primaryGoal: "weight_gain" | "weight_loss" | "strength" | "cardio";
}

/**
 * Calculate comprehensive goal progress
 */
export function calculateGoalProgress(input: GoalTrackingInput): GoalProgress {
  const {
    goalStartWeight,
    goalStartDate,
    currentWeight,
    targetWeightMin,
    targetWeightMax,
    goalWeeklyRate,
    actualWeeklyRate,
  } = input;

  // Use mid-point of target range
  const targetWeight = (targetWeightMin + targetWeightMax) / 2;

  // Calculate changes
  const totalChange = targetWeight - goalStartWeight;
  const currentChange = currentWeight - goalStartWeight;
  const remainingChange = targetWeight - currentWeight;

  // Calculate progress percentage
  const progressPercent = totalChange !== 0
    ? Math.min(Math.abs(currentChange / totalChange) * 100, 100)
    : 0;

  // Calculate weeks elapsed
  const now = new Date();
  const weeksElapsed = Math.max(
    (now.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7),
    0
  );

  // Calculate weeks remaining and estimated completion
  let weeksRemaining: number | null = null;
  let estimatedCompletion: Date | null = null;

  if (actualWeeklyRate && actualWeeklyRate !== 0) {
    // Use actual rate if available
    weeksRemaining = Math.abs(remainingChange / actualWeeklyRate);
    estimatedCompletion = new Date(now.getTime() + weeksRemaining * 7 * 24 * 60 * 60 * 1000);
  } else if (goalWeeklyRate !== 0) {
    // Fall back to target rate
    weeksRemaining = Math.abs(remainingChange / goalWeeklyRate);
    estimatedCompletion = new Date(now.getTime() + weeksRemaining * 7 * 24 * 60 * 60 * 1000);
  }

  // Determine if on track
  const expectedChange = goalWeeklyRate * weeksElapsed;
  const variance = currentChange - expectedChange;
  const isOnTrack = Math.abs(variance) <= Math.abs(goalWeeklyRate * 2); // Within 2 weeks of expected

  // Determine status
  let status: GoalProgress["status"];

  // Check if goal reached
  if (isGoalReached(currentWeight, targetWeightMin, targetWeightMax, totalChange > 0)) {
    status = "goal_reached";
  } else if (actualWeeklyRate !== undefined && actualWeeklyRate !== null) {
    // Use actual rate to determine status
    const rateVariance = actualWeeklyRate - goalWeeklyRate;
    const rateVariancePercent = Math.abs(rateVariance / goalWeeklyRate);

    if (rateVariancePercent < 0.1) {
      status = "on_track"; // Within 10% of target rate
    } else if (
      (totalChange > 0 && actualWeeklyRate > goalWeeklyRate) ||
      (totalChange < 0 && actualWeeklyRate < goalWeeklyRate)
    ) {
      status = "ahead"; // Progressing faster than target
    } else if (rateVariancePercent < 0.3) {
      status = "behind"; // 10-30% off target rate
    } else {
      status = "off_track"; // More than 30% off target rate
    }
  } else {
    // No actual rate data, use progress variance
    const variancePercent = Math.abs(variance / expectedChange);

    if (variancePercent < 0.1) {
      status = "on_track";
    } else if (
      (totalChange > 0 && variance > 0) ||
      (totalChange < 0 && variance < 0)
    ) {
      status = "ahead";
    } else if (variancePercent < 0.3) {
      status = "behind";
    } else {
      status = "off_track";
    }
  }

  // Calculate days to goal
  const daysToGoal = weeksRemaining !== null ? Math.round(weeksRemaining * 7) : null;

  return {
    totalChange,
    currentChange,
    progressPercent,
    remainingChange,
    weeksElapsed,
    weeksRemaining,
    estimatedCompletion,
    isOnTrack,
    status,
    daysToGoal,
  };
}

/**
 * Check if goal has been reached
 */
export function isGoalReached(
  currentWeight: number,
  targetWeightMin: number,
  targetWeightMax: number,
  isGainingWeight: boolean
): boolean {
  if (isGainingWeight) {
    return currentWeight >= targetWeightMin;
  } else {
    return currentWeight <= targetWeightMax;
  }
}

/**
 * Calculate actual weekly rate from weigh-in history
 * Uses linear regression for best-fit trend line
 */
export function calculateActualWeeklyRate(weighIns: Array<{ weight: number; date: Date }>): number | null {
  if (weighIns.length < 2) {
    return null;
  }

  // Sort by date
  const sorted = [...weighIns].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate simple linear regression
  const firstDate = sorted[0].date.getTime();
  const n = sorted.length;

  // Convert dates to weeks since first weigh-in
  const data = sorted.map((w) => ({
    x: (w.date.getTime() - firstDate) / (1000 * 60 * 60 * 24 * 7), // weeks
    y: w.weight,
  }));

  // Calculate means
  const meanX = data.reduce((sum, d) => sum + d.x, 0) / n;
  const meanY = data.reduce((sum, d) => sum + d.y, 0) / n;

  // Calculate slope (weekly rate)
  const numerator = data.reduce((sum, d) => sum + (d.x - meanX) * (d.y - meanY), 0);
  const denominator = data.reduce((sum, d) => sum + Math.pow(d.x - meanX, 2), 0);

  if (denominator === 0) {
    return null;
  }

  const slope = numerator / denominator;

  return slope; // kg per week
}

/**
 * Format goal progress for display
 */
export function formatGoalProgress(progress: GoalProgress): {
  title: string;
  subtitle: string;
  color: string;
  emoji: string;
} {
  const { progressPercent, status, daysToGoal } = progress;

  let title: string;
  let subtitle: string;
  let color: string;
  let emoji: string;

  switch (status) {
    case "goal_reached":
      title = "Goal Reached!";
      subtitle = "Congratulations on achieving your target";
      color = "#10b981"; // green
      emoji = "🎉";
      break;

    case "ahead":
      title = `${Math.round(progressPercent)}% Complete`;
      subtitle = daysToGoal
        ? `Ahead of schedule · ~${daysToGoal} days to goal`
        : "Ahead of schedule";
      color = "#10b981"; // green
      emoji = "🚀";
      break;

    case "on_track":
      title = `${Math.round(progressPercent)}% Complete`;
      subtitle = daysToGoal
        ? `On track · ~${daysToGoal} days to goal`
        : "On track";
      color = "#3b82f6"; // blue
      emoji = "💪";
      break;

    case "behind":
      title = `${Math.round(progressPercent)}% Complete`;
      subtitle = daysToGoal
        ? `Slightly behind · ~${daysToGoal} days to goal`
        : "Slightly behind schedule";
      color = "#f59e0b"; // amber
      emoji = "⚡";
      break;

    case "off_track":
      title = `${Math.round(progressPercent)}% Complete`;
      subtitle = "Off track · Let's adjust your plan";
      color = "#ef4444"; // red
      emoji = "🎯";
      break;
  }

  return { title, subtitle, color, emoji };
}

/**
 * Calculate recommended goal adjustment
 */
export function calculateGoalAdjustment(
  progress: GoalProgress,
  input: GoalTrackingInput,
  weeksBehind: number
): {
  suggestedTargetMin: number;
  suggestedTargetMax: number;
  suggestedWeeklyRate: number;
  reason: string;
} | null {
  const { actualWeeklyRate, goalWeeklyRate, targetWeightMin, targetWeightMax } = input;

  // Only suggest adjustment if significantly off track
  if (progress.status !== "off_track" || !actualWeeklyRate) {
    return null;
  }

  // Calculate the adjustment based on actual performance
  const adjustmentFactor = 0.7; // Make goal 70% of original pace

  const newWeeklyRate = goalWeeklyRate * adjustmentFactor;
  const targetRange = targetWeightMax - targetWeightMin;

  // Keep the same range width but adjust based on new rate
  const newTargetMin = targetWeightMin + (goalWeeklyRate - newWeeklyRate) * 8; // Assuming ~8 weeks average
  const newTargetMax = newTargetMin + targetRange;

  const reason = `Based on ${weeksBehind} weeks off track, we recommend adjusting to a more sustainable pace of ${Math.abs(newWeeklyRate).toFixed(1)} kg/week`;

  return {
    suggestedTargetMin: newTargetMin,
    suggestedTargetMax: newTargetMax,
    suggestedWeeklyRate: newWeeklyRate,
    reason,
  };
}

/**
 * Get goal status message for user
 */
export function getGoalStatusMessage(progress: GoalProgress): string {
  const { status, progressPercent, weeksElapsed } = progress;

  switch (status) {
    case "goal_reached":
      return "You've reached your goal! Time to set a new challenge or maintain your progress.";

    case "ahead":
      return `You're ${Math.round(progressPercent)}% of the way there and ahead of schedule! Keep up the great work.`;

    case "on_track":
      return `You're ${Math.round(progressPercent)}% complete and right on track. Consistency is key!`;

    case "behind":
      return `You're ${Math.round(progressPercent)}% complete but a bit behind schedule. Let's focus on getting back on track.`;

    case "off_track":
      if (weeksElapsed < 4) {
        return "It's still early. Let's focus on building consistency before making any major changes.";
      } else {
        return "Your progress has slowed. Would you like to adjust your goal to be more sustainable?";
      }

    default:
      return "Keep tracking your progress to see how you're doing!";
  }
}

/**
 * Determine if goal adjustment should be suggested
 */
export function shouldSuggestGoalAdjustment(
  progress: GoalProgress,
  consecutiveWeeksOffTrack: number
): boolean {
  return (
    progress.status === "off_track" &&
    progress.weeksElapsed >= 3 &&
    consecutiveWeeksOffTrack >= 3
  );
}
