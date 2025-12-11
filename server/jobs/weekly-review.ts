import cron from "node-cron";
import { storage } from "../storage";
import { generateWeeklyReview, generateProgramAdjustments } from "../gemini/client";
import type { InsertWeeklyPerformance, InsertWeeklyReview, InsertCurrentWeekProgram, InsertGoalAdjustment } from "@shared/schema";
import { calculateMomentumScore } from "@shared/utils/momentum";
import { classifyWeek, type WeekClassificationInput } from "@shared/utils/weekClassification";
import { calculateGoalProgress, calculateActualWeeklyRate } from "@shared/utils/goalTracking";
import { detectPatterns, type WeekPerformanceData } from "@shared/utils/patternDetection";
import { checkGoalAdjustmentNeeded, calculateWeeksIntoGoal } from "@shared/utils/goalAdjustmentSystem";

/**
 * Weekly Review Cron Job
 * Runs every Saturday at 7am to:
 * 1. Require weigh-in (blocks navigation until complete)
 * 2. Calculate weekly performance metrics
 * 3. Classify week type (excellent/good/inconsistent/bad/recovery)
 * 4. Generate AI-powered review
 * 5. Generate program adjustments for next week
 * 6. Create next week's program
 *
 * NOTE: Week runs Saturday-Friday (Saturday 12am to Friday 11:59pm)
 * Weigh-in happens Saturday morning 7am, which becomes the new week's starting weight
 */

function getWeekBoundaries(date: Date = new Date()): { weekStart: Date; weekEnd: Date } {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  // Calculate days to previous Saturday
  const daysToSaturday = dayOfWeek === 6 ? 0 : (dayOfWeek + 1);

  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - daysToSaturday); // Saturday
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Friday
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

async function calculateWeeklyPerformance(userId: string): Promise<InsertWeeklyPerformance | null> {
  try {
    const { weekStart, weekEnd } = getWeekBoundaries();

    // Get current week's program
    const currentProgram = await storage.getCurrentWeekProgram(userId);
    if (!currentProgram) {
      console.log(`No current program for user ${userId}`);
      return null;
    }

    // Get workout sessions for this week
    const allSessions = await storage.getWorkoutSessionsByUser(userId, 100);
    const weekSessions = allSessions.filter(session => {
      const sessionDate = new Date(session.workoutDate);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });

    // Count planned vs completed workouts
    const workoutsPlanned = Object.keys(currentProgram.workouts).length;
    const workoutsCompleted = weekSessions.filter(s => s.status === "completed").length;
    const workoutCompletionRate = workoutsPlanned > 0 ? workoutsCompleted / workoutsPlanned : 0;

    // Get daily nutrition data for the week
    let nutritionDaysHitTarget = 0;
    let totalCalories = 0;
    let totalProtein = 0;
    let nutritionDaysLogged = 0;

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(weekStart);
      checkDate.setDate(weekStart.getDate() + i);
      const nutrition = await storage.getDailyNutrition(userId, checkDate);

      if (nutrition && nutrition.mealsCount > 0) {
        nutritionDaysLogged++;
        totalCalories += nutrition.caloriesActual;
        totalProtein += nutrition.proteinActual;
        if (nutrition.hitTarget) {
          nutritionDaysHitTarget++;
        }
      }
    }

    const nutritionConsistencyRate = nutritionDaysHitTarget / 7;
    const avgCalories = nutritionDaysLogged > 0 ? Math.round(totalCalories / nutritionDaysLogged) : null;
    const avgProtein = nutritionDaysLogged > 0 ? Math.round(totalProtein / nutritionDaysLogged) : null;

    // Get weight data
    const weightEntries = await storage.getWeightEntries(userId, 14);
    const weekStartWeight = weightEntries.find(w => {
      const entryDate = new Date(w.date);
      return entryDate >= weekStart && entryDate <= new Date(weekStart.getTime() + 24 * 60 * 60 * 1000);
    });
    const weekEndWeight = weightEntries[0]; // Latest entry

    const weightStart = weekStartWeight?.weight || null;
    const weightEnd = weekEndWeight?.weight || null;
    const weightChange = (weightStart && weightEnd) ? weightEnd - weightStart : null;

    // Get target from user profile
    const profile = await storage.getUserProfile(userId);
    const weightChangeTarget = profile?.weeklyWeightChangeTarget || 0;

    let weightStatus: "on_track" | "above_target" | "below_target" | null = null;
    if (weightChange !== null) {
      const tolerance = 0.2; // 200g tolerance
      if (Math.abs(weightChange - weightChangeTarget) <= tolerance) {
        weightStatus = "on_track";
      } else if (weightChange > weightChangeTarget) {
        weightStatus = "above_target";
      } else {
        weightStatus = "below_target";
      }
    }

    // Calculate exercise feelings and extra rest
    let totalFeeling = 0;
    let totalExtraRest = 0;
    let exerciseCount = 0;

    for (const session of weekSessions) {
      const exercises = await storage.getExercisesByWorkout(session.id);
      for (const exercise of exercises) {
        exerciseCount++;

        // Convert feeling to numeric (Easy=1.0, Good=0.75, Hard=0.5)
        if (exercise.feeling === "Easy") totalFeeling += 1.0;
        else if (exercise.feeling === "Good") totalFeeling += 0.75;
        else if (exercise.feeling === "Hard") totalFeeling += 0.5;

        if (exercise.extraRestTime) {
          totalExtraRest += exercise.extraRestTime;
        }
      }
    }

    const avgFeeling = exerciseCount > 0 ? totalFeeling / exerciseCount : null;
    const avgExtraRest = exerciseCount > 0 ? Math.round(totalExtraRest / exerciseCount) : null;

    // Calculate momentum score
    const mealsLogged = nutritionDaysLogged * 3; // Approximate
    const targetMealsPerDay = 3;

    // Calculate current streak (need activity dates)
    const activityDates: Date[] = [];
    weekSessions.forEach(s => activityDates.push(new Date(s.workoutDate)));

    const allMeals = await storage.getMealLogsByUser(userId, 30);
    allMeals.forEach(m => activityDates.push(new Date(m.mealDate)));

    // Simple streak calculation (TODO: use calculateStreak from momentum.ts)
    const currentStreak = activityDates.length > 0 ? 3 : 0; // Placeholder

    const momentumScore = calculateMomentumScore({
      workoutsCompleted,
      workoutsScheduled: workoutsPlanned,
      mealsLogged,
      targetMealsPerDay,
      weeklyWeightChange: weightChange || 0,
      targetWeightChange: weightChangeTarget,
      averageCalorieDeviation: avgCalories && profile?.dailyCaloriesTarget
        ? Math.abs(avgCalories - profile.dailyCaloriesTarget) / profile.dailyCaloriesTarget
        : 0,
      currentStreak,
    });

    // Identify highlights and issues
    const highlights: string[] = [];
    const issues: string[] = [];

    if (workoutCompletionRate >= 0.8) highlights.push("Excellent workout consistency");
    if (nutritionDaysHitTarget >= 5) highlights.push("Great nutrition adherence");
    if (weightStatus === "on_track") highlights.push("Weight change on target");

    if (workoutCompletionRate < 0.5) issues.push("Low workout completion rate");
    if (nutritionDaysHitTarget < 3) issues.push("Inconsistent nutrition tracking");
    if (avgExtraRest && avgExtraRest > 30) issues.push("Taking too much extra rest");

    // Classify the week
    const classificationInput: WeekClassificationInput = {
      workoutsCompleted,
      workoutsPlanned,
      nutritionDaysHitTarget,
      weightChange,
      weightChangeTarget,
      missedDays: [],
    };

    const classification = classifyWeek(classificationInput);

    // Determine if this is a bad week
    const isBadWeek = classification.weekType === "bad";

    // Check if this is a recovery week (would be set by previous week's bad week handler)
    const previousWeek = await storage.getWeeklyPerformanceHistory(userId, 1);
    const isRecoveryWeek = previousWeek.length > 0 && previousWeek[0].isBadWeek === true;
    const recoveryFromWeek = isRecoveryWeek && previousWeek.length > 0 ? previousWeek[0].id : null;

    // Adjust momentum score for bad weeks and recovery weeks
    let adjustedMomentumScore = momentumScore;
    if (isBadWeek) {
      adjustedMomentumScore = Math.min(momentumScore, 30); // Cap at 30 for bad weeks
    } else if (isRecoveryWeek && classification.weekType !== "bad") {
      adjustedMomentumScore = Math.min(momentumScore + 10, 100); // +10 bonus for successful recovery
    }

    const performance: InsertWeeklyPerformance = {
      userId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      workoutsPlanned,
      workoutsCompleted,
      workoutCompletionRate,
      missedDays: null,
      nutritionDaysHitTarget,
      nutritionConsistencyRate,
      avgCalories,
      avgProtein,
      weightStart,
      weightEnd,
      weightChange,
      weightChangeTarget,
      weightStatus,
      currentStreak,
      longestStreak: null,
      avgFeeling,
      avgExtraRest,
      momentumScore: adjustedMomentumScore,
      momentumBreakdown: null,
      highlights: highlights.length > 0 ? highlights : null,
      issues: issues.length > 0 ? issues : null,
      // Week classification fields
      weekType: classification.weekType,
      weekTypeConfidence: classification.confidence,
      isBadWeek,
      badWeekReasons: null, // Will be filled by UI when user provides context
      userNotes: null,
      isRecoveryWeek,
      recoveryFromWeek,
      programAdjusted: false,
      adjustmentType: null,
    };

    return performance;
  } catch (error) {
    console.error(`Error calculating performance for user ${userId}:`, error);
    return null;
  }
}

async function generateReviewForUser(userId: string): Promise<void> {
  try {
    console.log(`Generating weekly review for user ${userId}...`);

    // Calculate performance
    const performance = await calculateWeeklyPerformance(userId);
    if (!performance) {
      console.log(`Skipping review for user ${userId} - no performance data`);
      return;
    }

    // Save performance
    const savedPerformance = await storage.createWeeklyPerformance(performance);

    // Get user context
    const profile = await storage.getUserProfile(userId);
    if (!profile) {
      console.log(`No profile found for user ${userId}`);
      return;
    }

    // Generate AI review
    const reviewInput = {
      userContext: {
        age: profile.age,
        currentWeight: profile.currentWeight,
        goals: `${profile.primaryGoal}${profile.secondaryGoal ? `, ${profile.secondaryGoal}` : ""}`,
      },
      weekData: {
        workoutsPlanned: performance.workoutsPlanned,
        workoutsCompleted: performance.workoutsCompleted,
        nutritionDaysHitTarget: performance.nutritionDaysHitTarget,
        weightStart: performance.weightStart || profile.currentWeight,
        weightEnd: performance.weightEnd || profile.currentWeight,
        weightChangeTarget: performance.weightChangeTarget || 0,
        avgExtraRest: performance.avgExtraRest || 0,
        patterns: [],
        // Pass week type information for AI tone adjustment
        weekType: performance.weekType,
        isBadWeek: performance.isBadWeek,
        isRecoveryWeek: performance.isRecoveryWeek,
        badWeekReasons: performance.badWeekReasons,
        userNotes: performance.userNotes,
      },
    };

    const aiReview = await generateWeeklyReview(reviewInput);

    // Save review
    const review: InsertWeeklyReview = {
      userId,
      weekPerformanceId: savedPerformance.id,
      weekStartDate: performance.weekStartDate,
      weekEndDate: performance.weekEndDate,
      weightSummary: aiReview.weightSummary || null,
      workoutSummary: aiReview.workoutSummary || null,
      nutritionSummary: aiReview.nutritionSummary || null,
      patternsDetected: aiReview.patternsDetected || null,
      recommendations: aiReview.recommendations || null,
      aiSummaryText: aiReview.aiSummaryText || null,
      aiModelUsed: "gemini-2.5-flash",
      tone: aiReview.tone || "neutral",
      confidence: aiReview.confidence || null,
    };

    await storage.createWeeklyReview(review);

    // Check if goal adjustment should be triggered
    await checkAndCreateGoalAdjustment(userId, savedPerformance, profile);

    // Generate program adjustments for next week
    const currentProgram = await storage.getCurrentWeekProgram(userId);
    if (currentProgram) {
      const adjustments = await generateProgramAdjustments(
        {
          age: profile.age,
          currentWeight: profile.currentWeight,
          goals: `${profile.primaryGoal}${profile.secondaryGoal ? `, ${profile.secondaryGoal}` : ""}`,
        },
        performance,
        currentProgram.workouts
      );

      // Create next week's program with adjustments
      const nextWeekStart = new Date(performance.weekEndDate);
      nextWeekStart.setDate(nextWeekStart.getDate() + 1);
      nextWeekStart.setHours(0, 0, 0, 0);

      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
      nextWeekEnd.setHours(23, 59, 59, 999);

      // Apply adjustments to current program (simplified - just update workouts)
      const nextWeekProgram: InsertCurrentWeekProgram = {
        userId,
        templateId: currentProgram.templateId,
        weekNumber: currentProgram.weekNumber + 1,
        weekStartDate: nextWeekStart,
        weekEndDate: nextWeekEnd,
        previousWeekId: currentProgram.id,
        workouts: currentProgram.workouts, // TODO: Apply adjustments
        aiAdjustments: adjustments.adjustments || null,
        weeklyFocus: adjustments.weeklyFocus || null,
        nutritionGuidance: adjustments.nutritionGuidance || null,
      };

      await storage.createWeekProgram(nextWeekProgram);

      console.log(`✓ Weekly review and next week's program created for user ${userId}`);
    } else {
      console.log(`✓ Weekly review created for user ${userId} (no program adjustments - no current program)`);
    }

    // TODO: Send push notification to user
  } catch (error) {
    console.error(`Error generating review for user ${userId}:`, error);
  }
}

/**
 * Check if goal adjustment is needed and create adjustment record
 */
async function checkAndCreateGoalAdjustment(
  userId: string,
  performance: any,
  profile: any
): Promise<void> {
  try {
    // Skip if user doesn't have goal tracking set up
    if (!profile.goalStartDate || !profile.targetWeightMin || !profile.targetWeightMax) {
      return;
    }

    // Get weekly performance history for pattern detection
    const performanceHistory = await storage.getWeeklyPerformanceHistory(userId, 12);

    // Transform to WeekPerformanceData format
    const weeklyHistory: WeekPerformanceData[] = performanceHistory.map((perf) => ({
      weekStartDate: new Date(perf.weekStartDate),
      weekType: perf.weekType as "excellent" | "good" | "inconsistent" | "bad" | "recovery",
      momentumScore: perf.momentumScore || 0,
      workoutCompletionRate: perf.workoutCompletionRate || 0,
      nutritionConsistencyRate: perf.nutritionConsistencyRate || 0,
      weightChange: perf.weightChange,
      weightChangeTarget: perf.weightChangeTarget || 0,
      isBadWeek: perf.isBadWeek || false,
      isRecoveryWeek: perf.isRecoveryWeek || false,
    }));

    // Detect patterns
    const patterns = detectPatterns(weeklyHistory);

    // Calculate goal progress
    const weightEntries = await storage.getWeightEntries(userId, 30);
    const actualWeeklyRate = calculateActualWeeklyRate(
      weightEntries.map((w) => ({
        weight: w.weight,
        date: new Date(w.date),
      }))
    );

    const goalProgress = calculateGoalProgress({
      goalStartWeight: profile.goalStartWeight || profile.currentWeight,
      goalStartDate: new Date(profile.goalStartDate),
      currentWeight: profile.currentWeight,
      targetWeightMin: profile.targetWeightMin,
      targetWeightMax: profile.targetWeightMax,
      goalWeeklyRate: profile.goalWeeklyRate || profile.weeklyWeightChangeTarget || 0,
      actualWeeklyRate,
    });

    // Calculate weeks into goal
    const weeksIntoGoal = calculateWeeksIntoGoal(new Date(profile.goalStartDate));

    // Check if adjustment is needed
    const adjustmentTrigger = checkGoalAdjustmentNeeded({
      currentGoal: {
        goalStartWeight: profile.goalStartWeight || profile.currentWeight,
        goalStartDate: new Date(profile.goalStartDate),
        targetWeightMin: profile.targetWeightMin,
        targetWeightMax: profile.targetWeightMax,
        goalWeeklyRate: profile.goalWeeklyRate || profile.weeklyWeightChangeTarget || 0,
      },
      currentProgress: goalProgress,
      patterns,
      actualWeeklyRate,
      weeksIntoGoal,
    });

    // Create goal adjustment record if triggered
    if (adjustmentTrigger.shouldTrigger) {
      console.log(`📊 Goal adjustment triggered for user ${userId}: ${adjustmentTrigger.triggerReason}`);

      // Check if there's already a pending adjustment
      const existingAdjustment = await storage.getPendingGoalAdjustment(userId);
      if (existingAdjustment) {
        console.log(`⚠️  Pending goal adjustment already exists for user ${userId}`);
        return;
      }

      const adjustment: InsertGoalAdjustment = {
        userId,
        adjustmentDate: new Date(),
        triggerType: adjustmentTrigger.triggerType,
        triggerReason: adjustmentTrigger.triggerReason,
        weeklyPerformanceId: performance.id,
        previousGoal: {
          targetMin: profile.targetWeightMin,
          targetMax: profile.targetWeightMax,
          weeklyRate: profile.goalWeeklyRate || profile.weeklyWeightChangeTarget || 0,
        },
        newGoal: {
          targetMin: adjustmentTrigger.suggestedGoal.targetWeightMin,
          targetMax: adjustmentTrigger.suggestedGoal.targetWeightMax,
          weeklyRate: adjustmentTrigger.suggestedGoal.weeklyRate,
        },
        userResponse: null,
        userNotes: null,
        aiModelUsed: "gemini-2.5-flash",
        confidence: adjustmentTrigger.confidence,
      };

      await storage.createGoalAdjustment(adjustment);
      console.log(`✓ Goal adjustment created for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error checking goal adjustment for user ${userId}:`, error);
  }
}

async function processAllUsers(): Promise<void> {
  try {
    console.log("\n=== Weekly Review Job Started ===");
    console.log(`Time: ${new Date().toISOString()}`);

    // Get all users by iterating through user profiles
    // Note: This is inefficient for production - should add a getAllUsers() method
    // For now, we'll need to track users differently or add the method

    // Temporary solution: We'll process users we know about from workout sessions
    const recentSessions = await storage.getWorkoutSessionsByUser("demo-user-id", 1);

    // For MVP, we can hardcode or just process the authenticated users we have
    // In production, add a getAllUsers() method to storage interface

    console.log("Note: Processing known users only. Add getAllUsers() method for production.");

    // Process demo user if exists
    // await generateReviewForUser("demo-user-id");

    console.log("=== Weekly Review Job Completed ===\n");
  } catch (error) {
    console.error("Error in weekly review job:", error);
  }
}

/**
 * Initialize the weekly review cron job
 * Runs every Saturday at 7:00 AM
 */
export function startWeeklyReviewJob(): void {
  // Cron format: minute hour day-of-month month day-of-week
  // "0 7 * * 6" = Every Saturday at 7:00 AM
  const task = cron.schedule("0 7 * * 6", processAllUsers, {
    scheduled: true,
    timezone: "America/New_York", // Adjust to user's timezone
  });

  console.log("✓ Weekly review cron job scheduled (Saturdays at 7am)");

  // Uncomment to run immediately for testing
  // processAllUsers();
}

// For manual triggering (useful for testing)
export async function triggerWeeklyReview(userId: string): Promise<void> {
  await generateReviewForUser(userId);
}
