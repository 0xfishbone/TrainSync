/**
 * Web APIs Utilities for PWA Features
 * Handles notifications, vibration, and wake lock
 */

// ==========================================================================
// NOTIFICATIONS
// ==========================================================================

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === "granted") {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      // Use service worker for better notification handling
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          vibrate: [200, 100, 200],
          ...options,
        });
      });
    } else {
      // Fallback to regular notification
      new Notification(title, {
        icon: "/icon-192.png",
        ...options,
      });
    }
  }
}

// Notification presets
export function notifyWorkoutComplete() {
  showNotification("Workout Complete! 💪", {
    body: "Great job! Don't forget to log your meals.",
    tag: "workout-complete",
  });
}

export function notifyRestTimerEnd() {
  showNotification("Rest Timer Complete", {
    body: "Time to get back to work!",
    tag: "rest-timer",
    requireInteraction: true,
  });
}

export function notifyMealReminder() {
  showNotification("Meal Reminder 🍽️", {
    body: "Don't forget to log your meals today!",
    tag: "meal-reminder",
  });
}

export function notifyWeeklyReview() {
  showNotification("Weekly Review Ready ⭐", {
    body: "Your AI-powered weekly performance review is ready!",
    tag: "weekly-review",
  });
}

// ==========================================================================
// VIBRATION
// ==========================================================================

export function vibrate(pattern: number | number[] = 200): boolean {
  if (!("vibrate" in navigator)) {
    console.warn("Vibration not supported");
    return false;
  }

  return navigator.vibrate(pattern);
}

// Vibration presets
export const VIBRATION_PATTERNS = {
  success: [100, 50, 100],
  warning: [200, 100, 200, 100, 200],
  error: [500],
  tick: [10],
  timerEnd: [200, 100, 200, 100, 400],
  setComplete: [100, 50, 100],
};

export function vibrateSuccess() {
  return vibrate(VIBRATION_PATTERNS.success);
}

export function vibrateWarning() {
  return vibrate(VIBRATION_PATTERNS.warning);
}

export function vibrateError() {
  return vibrate(VIBRATION_PATTERNS.error);
}

export function vibrateTick() {
  return vibrate(VIBRATION_PATTERNS.tick);
}

export function vibrateTimerEnd() {
  return vibrate(VIBRATION_PATTERNS.timerEnd);
}

export function vibrateSetComplete() {
  return vibrate(VIBRATION_PATTERNS.setComplete);
}

// ==========================================================================
// WAKE LOCK
// ==========================================================================

let wakeLock: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<boolean> {
  if (!("wakeLock" in navigator)) {
    console.warn("Wake Lock API not supported");
    return false;
  }

  try {
    wakeLock = await navigator.wakeLock.request("screen");

    wakeLock.addEventListener("release", () => {
      console.log("Wake Lock released");
      wakeLock = null;
    });

    console.log("Wake Lock acquired");
    return true;
  } catch (err: any) {
    console.error(`Wake Lock error: ${err.name}, ${err.message}`);
    return false;
  }
}

export async function releaseWakeLock() {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log("Wake Lock manually released");
    } catch (err) {
      console.error("Wake Lock release error:", err);
    }
  }
}

export function isWakeLockActive(): boolean {
  return wakeLock !== null;
}

// Auto-reacquire wake lock when page becomes visible (for workouts)
export function setupWakeLockAutoReacquire() {
  if (!("wakeLock" in navigator)) {
    return;
  }

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && wakeLock === null) {
      // Only re-acquire if we're on a page that needs it
      const shouldReacquire = window.location.pathname === "/workout";
      if (shouldReacquire) {
        await requestWakeLock();
      }
    }
  });
}

// ==========================================================================
// BACKGROUND SYNC
// ==========================================================================

export async function registerBackgroundSync(tag: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("sync" in ServiceWorkerRegistration.prototype)) {
    console.warn("Background Sync not supported");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(tag);
    console.log(`Background sync registered: ${tag}`);
    return true;
  } catch (err) {
    console.error("Background sync registration failed:", err);
    return false;
  }
}

export async function syncWorkouts() {
  return registerBackgroundSync("sync-workouts");
}

export async function syncMeals() {
  return registerBackgroundSync("sync-meals");
}

// ==========================================================================
// SHARE API
// ==========================================================================

export async function shareWorkout(data: { title: string; text: string; url?: string }): Promise<boolean> {
  if (!("share" in navigator)) {
    console.warn("Web Share API not supported");
    return false;
  }

  try {
    await navigator.share({
      title: data.title,
      text: data.text,
      url: data.url || window.location.href,
    });
    return true;
  } catch (err: any) {
    if (err.name !== "AbortError") {
      console.error("Share failed:", err);
    }
    return false;
  }
}

// ==========================================================================
// INSTALL PROMPT
// ==========================================================================

let deferredPrompt: any = null;

export function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log("Install prompt ready");
  });

  window.addEventListener("appinstalled", () => {
    console.log("PWA installed");
    deferredPrompt = null;
  });
}

export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn("Install prompt not available");
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  console.log(`Install prompt outcome: ${outcome}`);
  deferredPrompt = null;

  return outcome === "accepted";
}

export function isInstallPromptAvailable(): boolean {
  return deferredPrompt !== null;
}
