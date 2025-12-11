import cron from "node-cron";
import { storage } from "../storage";

/**
 * Saturday Weigh-In Job
 * Runs every Saturday at 7:00 AM to:
 * 1. Send weigh-in reminder notification
 * 2. Block navigation until weigh-in is complete
 * 3. If bad week detected last week, prompt for context
 *
 * This runs BEFORE the weekly review job to ensure we have
 * the latest weight data when calculating performance.
 */

async function sendWeighInReminder(userId: string): Promise<void> {
  try {
    console.log(`Sending weigh-in reminder to user ${userId}...`);

    // Get user profile to check if they need weigh-in
    const profile = await storage.getUserProfile(userId);
    if (!profile) {
      console.log(`No profile found for user ${userId}`);
      return;
    }

    // Check if user already weighed in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weightEntries = await storage.getWeightEntries(userId, 1);
    const latestEntry = weightEntries[0];

    if (latestEntry) {
      const entryDate = new Date(latestEntry.date);
      entryDate.setHours(0, 0, 0, 0);

      if (entryDate.getTime() === today.getTime()) {
        console.log(`User ${userId} already weighed in today`);
        return;
      }
    }

    // Check last week's performance to see if it was a bad week
    const lastWeek = await storage.getWeeklyPerformanceHistory(userId, 1);
    const wasBadWeek = lastWeek.length > 0 && lastWeek[0].isBadWeek === true;

    // TODO: Send push notification
    // For now, just log
    console.log(`📊 Weigh-in reminder sent to user ${userId}`);
    if (wasBadWeek) {
      console.log(`⚠️ User had a bad week - will prompt for context after weigh-in`);
    }

  } catch (error) {
    console.error(`Error sending weigh-in reminder to user ${userId}:`, error);
  }
}

async function processAllUsers(): Promise<void> {
  try {
    console.log("\n=== Saturday Weigh-In Job Started ===");
    console.log(`Time: ${new Date().toISOString()}`);

    // TODO: Get all users - for now using placeholder
    // In production, implement storage.getAllUsers()

    console.log("Note: Processing known users only. Add getAllUsers() method for production.");

    console.log("=== Saturday Weigh-In Job Completed ===\n");
  } catch (error) {
    console.error("Error in Saturday weigh-in job:", error);
  }
}

/**
 * Initialize the Saturday weigh-in cron job
 * Runs every Saturday at 7:00 AM (before weekly review)
 */
export function startSaturdayWeighInJob(): void {
  // Cron format: minute hour day-of-month month day-of-week
  // "0 7 * * 6" = Every Saturday at 7:00 AM
  const task = cron.schedule("0 7 * * 6", processAllUsers, {
    scheduled: true,
    timezone: "America/New_York", // Adjust to user's timezone
  });

  console.log("✓ Saturday weigh-in cron job scheduled (Saturdays at 7am)");
}

// For manual triggering (useful for testing)
export async function triggerWeighInReminder(userId: string): Promise<void> {
  await sendWeighInReminder(userId);
}

/**
 * Check if user needs to weigh in today
 */
export async function checkWeighInRequired(userId: string): Promise<{
  required: boolean;
  isSaturday: boolean;
  alreadyWeighed: boolean;
  badWeekContextRequired: boolean;
}> {
  const today = new Date();
  const isSaturday = today.getDay() === 6;

  // Check if already weighed in today
  today.setHours(0, 0, 0, 0);
  const weightEntries = await storage.getWeightEntries(userId, 1);
  const latestEntry = weightEntries[0];

  let alreadyWeighed = false;
  if (latestEntry) {
    const entryDate = new Date(latestEntry.date);
    entryDate.setHours(0, 0, 0, 0);
    alreadyWeighed = entryDate.getTime() === today.getTime();
  }

  // Check if last week was a bad week (requires context)
  const lastWeek = await storage.getWeeklyPerformanceHistory(userId, 1);
  const badWeekContextRequired =
    lastWeek.length > 0 &&
    lastWeek[0].isBadWeek === true &&
    (!lastWeek[0].userNotes || lastWeek[0].badWeekReasons === null);

  return {
    required: isSaturday && !alreadyWeighed,
    isSaturday,
    alreadyWeighed,
    badWeekContextRequired,
  };
}
