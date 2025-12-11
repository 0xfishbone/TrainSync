import cron from "node-cron";
import { storage } from "../storage";

/**
 * Meal Reminder Cron Job
 * Runs hourly to check nutrition progress and send reminders:
 * - 9am: Breakfast reminder if no meals logged
 * - 1pm: Lunch reminder if calories < 800
 * - 6pm: Dinner reminder if calories < 1500
 * - 8pm: Evening reminder if < 70% of target
 */

interface ReminderContext {
  userId: string;
  userName: string;
  hour: number;
  calories: number;
  target: number;
  mealsCount: number;
  message: string;
  priority: "low" | "medium" | "high";
}

async function checkUserNutrition(userId: string, hour: number): Promise<ReminderContext | null> {
  try {
    // Get user profile for name and targets
    const profile = await storage.getUserProfile(userId);
    if (!profile) return null;

    // Skip if notifications disabled
    if (!profile.notificationsEnabled) return null;

    // Get today's nutrition data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nutrition = await storage.getDailyNutrition(userId, today);

    // If no nutrition record exists, create one
    if (!nutrition) {
      await storage.createDailyNutrition({
        userId,
        date: today,
        caloriesTarget: profile.dailyCaloriesTarget,
        proteinTarget: profile.dailyProteinTarget,
        caloriesActual: 0,
        proteinActual: 0,
        mealsCount: 0,
        hitTarget: false,
        trainingDay: null,
        remindersSent: 0,
      });
    }

    const calories = nutrition?.caloriesActual || 0;
    const target = profile.dailyCaloriesTarget;
    const mealsCount = nutrition?.mealsCount || 0;
    const remindersSent = nutrition?.remindersSent || 0;

    // Quiet hours: before 6am and after 9pm
    if (hour < 6 || hour >= 21) return null;

    // Prevent spam: max 3 reminders per day
    if (remindersSent >= 3) return null;

    // Check different time windows
    let message = "";
    let priority: "low" | "medium" | "high" = "low";

    // 9am: Breakfast check
    if (hour === 9 && calories === 0) {
      message = `Good morning ${profile.name}! Don't forget to log your breakfast 🍳`;
      priority = "medium";
    }

    // 1pm: Lunch check
    else if (hour === 13 && calories < 800) {
      if (mealsCount === 0) {
        message = `Hey ${profile.name}, you haven't logged any meals today. Start tracking! 📊`;
        priority = "high";
      } else {
        message = `Lunch time! You're at ${calories} calories. Keep fueling your body 🥗`;
        priority = "medium";
      }
    }

    // 6pm: Dinner check (critical)
    else if (hour === 18 && calories < 1500) {
      const remaining = target - calories;
      message = `You still need ${remaining} calories to hit your target. Time for dinner! 🍽️`;
      priority = "high";
    }

    // 8pm: Evening reminder (last chance)
    else if (hour === 20) {
      const percentage = target > 0 ? (calories / target) * 100 : 0;
      if (percentage < 70) {
        message = `You're at ${Math.round(percentage)}% of your calorie goal. Add a snack before bed? 🥜`;
        priority = "medium";
      }
    }

    if (!message) return null;

    return {
      userId,
      userName: profile.name,
      hour,
      calories,
      target,
      mealsCount,
      message,
      priority,
    };
  } catch (error) {
    console.error(`Error checking nutrition for user ${userId}:`, error);
    return null;
  }
}

async function sendReminder(context: ReminderContext): Promise<void> {
  try {
    console.log(`[${context.priority.toUpperCase()}] Reminder for ${context.userName}:`);
    console.log(`  ${context.message}`);
    console.log(`  Progress: ${context.calories}/${context.target} cal, ${context.mealsCount} meals logged`);

    // Update reminders sent count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nutrition = await storage.getDailyNutrition(context.userId, today);
    if (nutrition) {
      await storage.updateDailyNutrition(nutrition.id, {
        remindersSent: (nutrition.remindersSent || 0) + 1,
      });
    }

    // TODO: Send actual push notification via service worker
    // TODO: Store notification in database for in-app display
    // For now, just log to console

  } catch (error) {
    console.error(`Error sending reminder to user ${context.userId}:`, error);
  }
}

async function checkAllUsers(): Promise<void> {
  try {
    const now = new Date();
    const hour = now.getHours();

    console.log(`\n[Meal Reminder Check] ${now.toLocaleTimeString()} (Hour: ${hour})`);

    // Note: In production, add getAllUsers() method to storage
    // For now, we'll process known users

    // Temporary solution: Get users from recent activity
    // In production, iterate through all active users

    // Example for demo:
    // const userIds = ["demo-user-id", "user-2", "user-3"];
    // for (const userId of userIds) {
    //   const reminder = await checkUserNutrition(userId, hour);
    //   if (reminder) {
    //     await sendReminder(reminder);
    //   }
    // }

    console.log("Note: Add getAllUsers() method to process all users in production");

  } catch (error) {
    console.error("Error in meal reminder check:", error);
  }
}

/**
 * Initialize the meal reminder cron job
 * Runs every hour at minute 0
 */
export function startMealReminderJob(): void {
  // Cron format: minute hour day-of-month month day-of-week
  // "0 * * * *" = Every hour at minute 0
  const task = cron.schedule("0 * * * *", checkAllUsers, {
    scheduled: true,
    timezone: "America/New_York", // Adjust to user's timezone
  });

  console.log("✓ Meal reminder cron job scheduled (hourly)");

  // Uncomment to run immediately for testing
  // checkAllUsers();
}

// For manual triggering (useful for testing)
export async function triggerMealReminder(userId: string): Promise<void> {
  const hour = new Date().getHours();
  const reminder = await checkUserNutrition(userId, hour);
  if (reminder) {
    await sendReminder(reminder);
  } else {
    console.log(`No reminder needed for user ${userId} at this time`);
  }
}
