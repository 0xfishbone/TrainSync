/**
 * Notification Manager for TrainSync
 * Handles meal reminders and workout notifications
 */

import {
  requestNotificationPermission,
  showNotification,
  notifyMealReminder,
  notifyWorkoutComplete,
  notifyWeeklyReview,
} from "./webApis";

interface NotificationSchedule {
  mealReminders: boolean;
  workoutReminders: boolean;
  weeklyReview: boolean;
}

// LocalStorage keys
const NOTIFICATION_PERMISSION_KEY = "trainsync_notification_permission";
const LAST_MEAL_REMINDER_KEY = "trainsync_last_meal_reminder";

/**
 * Initialize notifications system
 * Request permission and set up scheduling
 */
export async function initializeNotifications(): Promise<boolean> {
  // Check if already requested
  const previouslyRequested = localStorage.getItem(NOTIFICATION_PERMISSION_KEY);

  if (previouslyRequested === "granted") {
    return true;
  }

  if (previouslyRequested === "denied") {
    return false;
  }

  // Request permission
  const granted = await requestNotificationPermission();

  if (granted) {
    localStorage.setItem(NOTIFICATION_PERMISSION_KEY, "granted");

    // Show welcome notification
    showNotification("TrainSync Notifications Enabled! 🎉", {
      body: "You'll get meal reminders and weekly reviews",
      tag: "welcome",
    });

    // Start meal reminder checks
    startMealReminderScheduler();

    return true;
  } else {
    localStorage.setItem(NOTIFICATION_PERMISSION_KEY, "denied");
    return false;
  }
}

/**
 * Check if it's time for a meal reminder
 */
function shouldShowMealReminder(): boolean {
  const lastReminder = localStorage.getItem(LAST_MEAL_REMINDER_KEY);
  const now = new Date();

  if (!lastReminder) {
    return true;
  }

  const lastReminderDate = new Date(lastReminder);
  const hoursSinceLastReminder = (now.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60);

  // Show reminder every 4 hours minimum
  return hoursSinceLastReminder >= 4;
}

/**
 * Send meal reminder based on time of day
 */
export function sendMealReminder() {
  if (!shouldShowMealReminder()) {
    return;
  }

  const hour = new Date().getHours();
  let mealType = "meal";

  if (hour >= 6 && hour < 10) {
    mealType = "breakfast";
  } else if (hour >= 11 && hour < 14) {
    mealType = "lunch";
  } else if (hour >= 17 && hour < 21) {
    mealType = "dinner";
  } else if (hour >= 21 || hour < 6) {
    // Don't remind during night hours
    return;
  }

  showNotification(`Time to log ${mealType}! 🍽️`, {
    body: "Quick photo or voice log keeps you on track",
    tag: "meal-reminder",
    icon: "/icon-192.png",
    requireInteraction: false,
  });

  localStorage.setItem(LAST_MEAL_REMINDER_KEY, new Date().toISOString());
}

/**
 * Schedule meal reminder checks
 */
export function startMealReminderScheduler() {
  const permission = localStorage.getItem(NOTIFICATION_PERMISSION_KEY);

  if (permission !== "granted") {
    return;
  }

  // Check every hour for meal reminders
  setInterval(() => {
    sendMealReminder();
  }, 60 * 60 * 1000); // Every hour

  // Also check immediately
  setTimeout(() => {
    sendMealReminder();
  }, 5 * 60 * 1000); // 5 minutes after app load
}

/**
 * Notify when workout is complete
 */
export function notifyWorkoutCompleted(exerciseCount: number, duration: number) {
  const permission = localStorage.getItem(NOTIFICATION_PERMISSION_KEY);

  if (permission !== "granted") {
    return;
  }

  notifyWorkoutComplete();

  // Also suggest logging meals
  setTimeout(() => {
    showNotification("Don't forget nutrition! 💪", {
      body: "Log your post-workout meal to maximize results",
      tag: "post-workout-meal",
      requireInteraction: false,
    });
  }, 15 * 60 * 1000); // 15 minutes after workout
}

/**
 * Send weekly review notification
 */
export function notifyWeeklyReviewReady() {
  const permission = localStorage.getItem(NOTIFICATION_PERMISSION_KEY);

  if (permission !== "granted") {
    return;
  }

  notifyWeeklyReview();
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  return localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === "granted";
}

/**
 * Disable notifications
 */
export function disableNotifications() {
  localStorage.setItem(NOTIFICATION_PERMISSION_KEY, "denied");
}

/**
 * Re-enable notifications (will request permission again)
 */
export async function enableNotifications(): Promise<boolean> {
  localStorage.removeItem(NOTIFICATION_PERMISSION_KEY);
  return await initializeNotifications();
}
