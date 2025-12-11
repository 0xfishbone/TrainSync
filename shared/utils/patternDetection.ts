/**
 * Pattern Detection Algorithm
 *
 * Analyzes weekly performance history to detect:
 * - Consecutive bad weeks (2-3+ in a row)
 * - Slumps (performance trending down)
 * - Streaks (consistent excellence)
 * - Yo-yo patterns (alternating good/bad)
 * - Goal drift (consistently off-target over time)
 */

import type { WeekType } from "./weekClassification";

export interface WeekPerformanceData {
  weekStartDate: Date;
  weekType: WeekType;
  momentumScore: number;
  workoutCompletionRate: number;
  nutritionConsistencyRate: number;
  weightChange: number | null;
  weightChangeTarget: number;
  isBadWeek: boolean;
  isRecoveryWeek: boolean;
}

export interface DetectedPattern {
  type: PatternType;
  severity: "low" | "medium" | "high";
  description: string;
  recommendation: string;
  interventionRequired: boolean;
  weeksAffected: number;
}

export type PatternType =
  | "consecutive_bad_weeks"
  | "slump"
  | "excellent_streak"
  | "good_streak"
  | "yo_yo"
  | "goal_drift"
  | "consistent_performer"
  | "recovery_struggle";

/**
 * Analyze weekly performance history and detect patterns
 */
export function detectPatterns(
  weeklyHistory: WeekPerformanceData[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  if (weeklyHistory.length < 2) {
    return patterns; // Need at least 2 weeks to detect patterns
  }

  // Sort by date (most recent first)
  const sortedHistory = [...weeklyHistory].sort(
    (a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime()
  );

  // Pattern 1: Consecutive Bad Weeks
  const consecutiveBadWeeks = detectConsecutiveBadWeeks(sortedHistory);
  if (consecutiveBadWeeks) {
    patterns.push(consecutiveBadWeeks);
  }

  // Pattern 2: Slump (declining momentum)
  const slump = detectSlump(sortedHistory);
  if (slump) {
    patterns.push(slump);
  }

  // Pattern 3: Excellent/Good Streaks
  const streak = detectStreak(sortedHistory);
  if (streak) {
    patterns.push(streak);
  }

  // Pattern 4: Yo-Yo Pattern
  const yoyo = detectYoYoPattern(sortedHistory);
  if (yoyo) {
    patterns.push(yoyo);
  }

  // Pattern 5: Goal Drift
  const goalDrift = detectGoalDrift(sortedHistory);
  if (goalDrift) {
    patterns.push(goalDrift);
  }

  // Pattern 6: Recovery Struggle
  const recoveryStruggle = detectRecoveryStruggle(sortedHistory);
  if (recoveryStruggle) {
    patterns.push(recoveryStruggle);
  }

  // Pattern 7: Consistent Performer (positive pattern)
  if (patterns.length === 0 && sortedHistory.length >= 4) {
    const consistent = detectConsistentPerformance(sortedHistory);
    if (consistent) {
      patterns.push(consistent);
    }
  }

  return patterns;
}

/**
 * Detect consecutive bad weeks
 */
function detectConsecutiveBadWeeks(
  history: WeekPerformanceData[]
): DetectedPattern | null {
  let consecutiveCount = 0;

  for (const week of history) {
    if (week.isBadWeek && !week.isRecoveryWeek) {
      consecutiveCount++;
    } else {
      break; // Stop at first non-bad week
    }
  }

  if (consecutiveCount < 2) {
    return null;
  }

  let severity: "low" | "medium" | "high";
  let recommendation: string;
  let interventionRequired: boolean;

  if (consecutiveCount === 2) {
    severity = "medium";
    recommendation = "Two tough weeks in a row. Let's create a recovery plan to help you bounce back.";
    interventionRequired = true;
  } else if (consecutiveCount === 3) {
    severity = "high";
    recommendation = "Three weeks is a pattern. We should look at your goals and see if they need adjusting.";
    interventionRequired = true;
  } else {
    severity = "high";
    recommendation = "Extended slump detected. Let's reassess your goals together and find a sustainable path forward.";
    interventionRequired = true;
  }

  return {
    type: "consecutive_bad_weeks",
    severity,
    description: `${consecutiveCount} consecutive challenging weeks`,
    recommendation,
    interventionRequired,
    weeksAffected: consecutiveCount,
  };
}

/**
 * Detect declining momentum (slump)
 */
function detectSlump(history: WeekPerformanceData[]): DetectedPattern | null {
  if (history.length < 4) {
    return null;
  }

  const recentWeeks = history.slice(0, 4);
  const scores = recentWeeks.map((w) => w.momentumScore);

  // Check if momentum is trending down
  let decliningCount = 0;
  for (let i = 0; i < scores.length - 1; i++) {
    if (scores[i] < scores[i + 1]) {
      decliningCount++;
    }
  }

  // At least 3 out of 4 weeks declining
  if (decliningCount < 3) {
    return null;
  }

  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return {
    type: "slump",
    severity: avgScore < 40 ? "high" : "medium",
    description: "Momentum declining over the past month",
    recommendation: "Performance is trending down. Let's identify what's changed and make adjustments.",
    interventionRequired: avgScore < 40,
    weeksAffected: 4,
  };
}

/**
 * Detect positive streaks
 */
function detectStreak(history: WeekPerformanceData[]): DetectedPattern | null {
  let streakCount = 0;
  let streakType: "excellent" | "good" | null = null;

  for (const week of history) {
    if (week.weekType === "excellent" || week.weekType === "good") {
      streakCount++;
      if (!streakType) {
        streakType = week.weekType;
      }
    } else {
      break;
    }
  }

  if (streakCount < 3) {
    return null;
  }

  const type = streakType === "excellent" ? "excellent_streak" : "good_streak";

  return {
    type,
    severity: "low",
    description: `${streakCount} weeks of ${streakType} performance`,
    recommendation: "You're crushing it! Keep this momentum going.",
    interventionRequired: false,
    weeksAffected: streakCount,
  };
}

/**
 * Detect yo-yo pattern (alternating good/bad weeks)
 */
function detectYoYoPattern(history: WeekPerformanceData[]): DetectedPattern | null {
  if (history.length < 4) {
    return null;
  }

  const recentWeeks = history.slice(0, 6);
  let alternationCount = 0;

  for (let i = 0; i < recentWeeks.length - 1; i++) {
    const current = recentWeeks[i];
    const previous = recentWeeks[i + 1];

    const currentGood = current.weekType === "good" || current.weekType === "excellent";
    const previousGood = previous.weekType === "good" || previous.weekType === "excellent";
    const currentBad = current.weekType === "bad" || current.weekType === "inconsistent";
    const previousBad = previous.weekType === "bad" || previous.weekType === "inconsistent";

    if ((currentGood && previousBad) || (currentBad && previousGood)) {
      alternationCount++;
    }
  }

  // At least 3 alternations in 6 weeks
  if (alternationCount < 3) {
    return null;
  }

  return {
    type: "yo_yo",
    severity: "medium",
    description: "Performance alternating between good and challenging weeks",
    recommendation: "You're capable of great weeks, but consistency is missing. Let's identify what's different on good vs. bad weeks.",
    interventionRequired: true,
    weeksAffected: 6,
  };
}

/**
 * Detect goal drift (consistently missing weight targets)
 */
function detectGoalDrift(history: WeekPerformanceData[]): DetectedPattern | null {
  if (history.length < 3) {
    return null;
  }

  const recentWeeks = history.slice(0, 4);
  const weeksWithData = recentWeeks.filter((w) => w.weightChange !== null);

  if (weeksWithData.length < 3) {
    return null; // Not enough weight data
  }

  // Check if consistently off-target
  let offTargetCount = 0;
  let totalDeviation = 0;

  for (const week of weeksWithData) {
    if (week.weightChange === null) continue;

    const deviation = Math.abs(week.weightChange - week.weightChangeTarget);
    const deviationPercent = deviation / Math.abs(week.weightChangeTarget);

    if (deviationPercent > 0.3) {
      // More than 30% off target
      offTargetCount++;
      totalDeviation += deviation;
    }
  }

  if (offTargetCount < 3) {
    return null;
  }

  const avgDeviation = totalDeviation / offTargetCount;

  return {
    type: "goal_drift",
    severity: "high",
    description: "Consistently missing weight change targets",
    recommendation: `Your weight isn't changing as expected (off by ~${avgDeviation.toFixed(1)}kg/week). Let's adjust your goal to be more realistic.`,
    interventionRequired: true,
    weeksAffected: offTargetCount,
  };
}

/**
 * Detect struggling with recovery weeks
 */
function detectRecoveryStruggle(
  history: WeekPerformanceData[]
): DetectedPattern | null {
  const recoveryWeeks = history.filter((w) => w.isRecoveryWeek).slice(0, 2);

  if (recoveryWeeks.length === 0) {
    return null;
  }

  // Check if recovery weeks are still coming out as bad
  const strugglingRecovery = recoveryWeeks.filter(
    (w) => w.weekType === "bad" || w.momentumScore < 40
  );

  if (strugglingRecovery.length < 2) {
    return null;
  }

  return {
    type: "recovery_struggle",
    severity: "high",
    description: "Struggling even with reduced recovery goals",
    recommendation: "Recovery weeks aren't working. Something bigger might be going on. Let's talk about what support you need.",
    interventionRequired: true,
    weeksAffected: strugglingRecovery.length,
  };
}

/**
 * Detect consistent, stable performance (positive pattern)
 */
function detectConsistentPerformance(
  history: WeekPerformanceData[]
): DetectedPattern | null {
  const recentWeeks = history.slice(0, 4);

  // Check for stable good/excellent performance
  const goodWeeks = recentWeeks.filter(
    (w) => w.weekType === "good" || w.weekType === "excellent"
  );

  if (goodWeeks.length >= 3) {
    const avgMomentum =
      recentWeeks.reduce((sum, w) => sum + w.momentumScore, 0) / recentWeeks.length;

    return {
      type: "consistent_performer",
      severity: "low",
      description: "Steady, reliable performance over the past month",
      recommendation: `Momentum averaging ${Math.round(avgMomentum)}/100. You're building sustainable habits. Well done!`,
      interventionRequired: false,
      weeksAffected: 4,
    };
  }

  return null;
}

/**
 * Get prioritized interventions based on detected patterns
 */
export function prioritizeInterventions(patterns: DetectedPattern[]): DetectedPattern[] {
  // Sort by severity and intervention requirement
  return patterns
    .filter((p) => p.interventionRequired)
    .sort((a, b) => {
      // High severity first
      if (a.severity === "high" && b.severity !== "high") return -1;
      if (b.severity === "high" && a.severity !== "high") return 1;

      // Then by weeks affected (more weeks = higher priority)
      return b.weeksAffected - a.weeksAffected;
    });
}

/**
 * Determine if goal adjustment should be suggested based on patterns
 */
export function shouldSuggestGoalAdjustment(patterns: DetectedPattern[]): boolean {
  return patterns.some(
    (p) =>
      (p.type === "goal_drift" || p.type === "consecutive_bad_weeks" || p.type === "slump") &&
      p.severity === "high"
  );
}

/**
 * Determine if intervention is urgently needed
 */
export function isUrgentIntervention(patterns: DetectedPattern[]): boolean {
  return patterns.some(
    (p) =>
      (p.type === "recovery_struggle" ||
        (p.type === "consecutive_bad_weeks" && p.weeksAffected >= 3)) &&
      p.interventionRequired
  );
}
