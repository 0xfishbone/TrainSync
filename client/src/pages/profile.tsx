import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MobileShell } from "@/components/layout/mobile-shell";
import {
  User,
  Settings,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Target,
  Calendar,
  Dumbbell,
  UtensilsCrossed,
  Moon,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { GoalProgressWidget } from "@/components/goal-progress-widget";

interface ProfileData {
  name: string;
  age: number;
  currentWeight: number;
  primaryGoal: string;
  targetWeightMin?: number;
  targetWeightMax?: number;
  goalWeeklyRate?: number;
  weeklyWeightChangeTarget: number;
  notificationsEnabled?: boolean;
  hapticsEnabled?: boolean;
  // Training schedule
  trainingDaysPerWeek: number;
  availableDays: string[];
  sessionDuration: number;
  preferredTrainingTime?: string;
  trainingLocation?: string;
  // Equipment & limits
  equipmentAvailable: string[];
  injuries?: string[];
  exercisesToAvoid?: string[];
  // Nutrition
  dailyCaloriesTarget: number;
  dailyProteinTarget: number;
  // Appearance
  units: string;
}

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  notes?: string;
}

interface GoalProgressAPI {
  totalChange: number;
  currentChange: number;
  progressPercent: number;
  remainingChange: number;
  weeksElapsed: number;
  weeksRemaining: number | null;
  estimatedCompletion: string | null;
  isOnTrack: boolean;
  status: "ahead" | "on_track" | "behind" | "off_track" | "goal_reached";
  daysToGoal: number | null;
}

interface GoalProgressWidgetData {
  progressPercent: number;
  status: "ahead" | "on_track" | "behind" | "off_track" | "goal_reached";
  daysToGoal: number | null;
  currentWeight: number;
  targetWeightMin: number;
  targetWeightMax: number;
  currentChange: number;
  totalChange: number;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [goalProgress, setGoalProgress] = useState<GoalProgressWidgetData | null>(null);
  const [isLoadingWeights, setIsLoadingWeights] = useState(true);
  const [isLoadingGoal, setIsLoadingGoal] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("trainsync_user_id");
    if (!userId) {
      setLocation("/onboarding");
      return;
    }

    // Fetch profile first, then use it to enrich goal progress
    fetch("/api/profile", {
      headers: { "x-user-id": userId },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Profile not found");
        }
        const data = await res.json();
        const profileData: ProfileData = {
          name: data.name,
          age: data.age,
          currentWeight: data.currentWeight,
          primaryGoal: data.primaryGoal,
          targetWeightMin: data.targetWeightMin,
          targetWeightMax: data.targetWeightMax,
          goalWeeklyRate: data.goalWeeklyRate,
          weeklyWeightChangeTarget: data.weeklyWeightChangeTarget,
          notificationsEnabled: data.notificationsEnabled,
          hapticsEnabled: data.hapticsEnabled,
          trainingDaysPerWeek: data.trainingDaysPerWeek || 5,
          availableDays: data.availableDays || [],
          sessionDuration: data.sessionDuration || 60,
          preferredTrainingTime: data.preferredTrainingTime,
          trainingLocation: data.trainingLocation,
          equipmentAvailable: data.equipmentAvailable || [],
          injuries: data.injuries,
          exercisesToAvoid: data.exercisesToAvoid,
          dailyCaloriesTarget: data.dailyCaloriesTarget || 0,
          dailyProteinTarget: data.dailyProteinTarget || 0,
          units: data.units || "metric",
        };
        setProfile(profileData);

        // Now fetch goal progress and enrich it with profile data
        fetch("/api/goal/progress", {
          headers: { "x-user-id": userId },
        })
          .then(async (goalRes) => {
            if (goalRes.ok) {
              const goalData: GoalProgressAPI = await goalRes.json();

              // Transform to include profile data needed by widget
              const widgetData: GoalProgressWidgetData = {
                progressPercent: goalData.progressPercent,
                status: goalData.status,
                daysToGoal: goalData.daysToGoal,
                currentWeight: profileData.currentWeight,
                targetWeightMin: profileData.targetWeightMin || profileData.currentWeight,
                targetWeightMax: profileData.targetWeightMax || profileData.currentWeight,
                currentChange: goalData.currentChange,
                totalChange: goalData.totalChange,
              };
              setGoalProgress(widgetData);
            }
          })
          .catch((err) => {
            console.error("Failed to load goal progress", err);
          })
          .finally(() => setIsLoadingGoal(false));
      })
      .catch((err) => {
        console.error("Failed to load profile", err);
        toast.error("Failed to load profile");
        setIsLoadingGoal(false);
      });

    // Fetch weight history independently
    fetch("/api/weight?limit=10", {
      headers: { "x-user-id": userId },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setWeightHistory(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load weight history", err);
      })
      .finally(() => setIsLoadingWeights(false));
  }, [setLocation]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear localStorage
      localStorage.removeItem("trainsync_user_id");

      // Hard redirect to login to fully reset state
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to logout");
    }
  };

  // Helper functions for preview values
  const formatDays = (days: string[]) => {
    if (!days || days.length === 0) return "";
    const dayMap: Record<string, string> = {
      monday: "Mon", tuesday: "Tue", wednesday: "Wed",
      thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun"
    };
    return days.map(d => dayMap[d.toLowerCase()] || d).join(", ");
  };

  const subtitle = profile
    ? `${profile.primaryGoal} • ${profile.currentWeight.toFixed(1)}kg`
    : "Manage your account and preferences.";

  return (
    <MobileShell>
      <div className="p-6 pt-12 space-y-8">
        <header>
          <h1 className="text-2xl font-display font-bold mb-1">Profile</h1>
          <p className="text-secondary">{subtitle}</p>
        </header>

        <section className="bg-surface rounded-2xl p-6 border border-border flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-elevated border border-border flex items-center justify-center">
            <User size={32} className="text-secondary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {profile ? profile.name : "Loading..."}
            </h2>
            <p className="text-secondary text-sm">
              {profile ? `${profile.age} yrs • Goal: ${profile.primaryGoal}` : " "}
            </p>
          </div>
        </section>

        {/* Goal Progress - Compressed */}
        {!isLoadingGoal && goalProgress && profile && (
          <button
            onClick={() => setLocation("/goal-details")}
            className="w-full bg-surface rounded-2xl p-5 border border-border hover:border-primary/50 transition-all active:scale-[0.98] text-left"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-tertiary uppercase tracking-wider">GOAL</p>
                <p className="font-bold text-lg">
                  {profile.targetWeightMin && profile.targetWeightMax
                    ? profile.targetWeightMin === profile.targetWeightMax
                      ? `${profile.targetWeightMin.toFixed(1)} kg`
                      : `${profile.targetWeightMin.toFixed(1)}-${profile.targetWeightMax.toFixed(1)} kg`
                    : "Not set"}
                  <span className="text-secondary font-normal text-base ml-2">
                    ({goalProgress.progressPercent.toFixed(0)}% there)
                  </span>
                </p>
              </div>
              <ChevronRight size={20} className="text-secondary" />
            </div>
          </button>
        )}

        {/* Weight History - Compressed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-tertiary uppercase tracking-wider">Weight</h3>
            <button
              onClick={() => setLocation("/progress")}
              className="text-xs text-primary font-medium hover:underline"
            >
              Log Weight
            </button>
          </div>

          {isLoadingWeights ? (
            <div className="bg-surface rounded-2xl p-5 border border-border">
              <p className="text-secondary text-sm">Loading...</p>
            </div>
          ) : weightHistory.length === 0 ? (
            <button
              onClick={() => setLocation("/progress")}
              className="w-full bg-surface rounded-2xl p-5 border border-border hover:border-primary/50 transition-all active:scale-[0.98] text-center space-y-2"
            >
              <Target size={24} className="mx-auto text-secondary" />
              <p className="text-secondary">No weight entries yet</p>
              <p className="text-primary font-medium text-sm">Tap to log your first weigh-in</p>
            </button>
          ) : (
            <button
              onClick={() => setLocation("/progress")}
              className="w-full bg-surface rounded-2xl p-5 border border-border hover:border-primary/50 transition-all active:scale-[0.98] text-left"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-tertiary uppercase tracking-wider">CURRENT</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-lg">{weightHistory[0].weight.toFixed(1)} kg</p>
                    {weightHistory.length > 1 && (() => {
                      const change = weightHistory[0].weight - weightHistory[1].weight;
                      const entryDate = new Date(weightHistory[1].date);
                      const formattedDate = entryDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      });

                      return change !== 0 ? (
                        <p className={`text-sm font-medium flex items-center gap-1 ${
                          change > 0 ? 'text-green-500' : 'text-blue-500'
                        }`}>
                          {change > 0 ? (
                            <TrendingUp size={14} />
                          ) : (
                            <TrendingDown size={14} />
                          )}
                          {change > 0 ? '+' : ''}{change.toFixed(1)} kg since {formattedDate}
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
                <ChevronRight size={20} className="text-secondary" />
              </div>
            </button>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-bold text-tertiary uppercase tracking-wider">Settings</h3>

          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            {/* Training Schedule */}
            <button
              onClick={() => setLocation("/settings/schedule")}
              className="w-full p-4 flex items-center justify-between border-b border-border hover:bg-elevated transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="font-medium">Training Schedule</p>
                  {profile && (
                    <p className="text-xs text-secondary">
                      {profile.trainingDaysPerWeek} days/week • {formatDays(profile.availableDays) || "Not set"}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-secondary" />
            </button>

            {/* Equipment & Limits */}
            <button
              onClick={() => setLocation("/settings/equipment")}
              className="w-full p-4 flex items-center justify-between border-b border-border hover:bg-elevated transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="font-medium">Equipment & Limits</p>
                  {profile && (
                    <p className="text-xs text-secondary">
                      {profile.equipmentAvailable.length} items available
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-secondary" />
            </button>

            {/* Nutrition Targets */}
            <button
              onClick={() => setLocation("/settings/nutrition")}
              className="w-full p-4 flex items-center justify-between border-b border-border hover:bg-elevated transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="font-medium">Nutrition Targets</p>
                  {profile && (
                    <p className="text-xs text-secondary">
                      {profile.dailyCaloriesTarget.toLocaleString()} cal • {profile.dailyProteinTarget}g protein
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-secondary" />
            </button>

            {/* Notifications */}
            <button
              onClick={() => toast.info("Notification settings coming soon!")}
              className="w-full p-4 flex items-center justify-between border-b border-border hover:bg-elevated transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className="text-xs text-secondary">
                    {profile?.notificationsEnabled === false ? "Off" : "On"}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-secondary" />
            </button>

            {/* Appearance */}
            <button
              onClick={() => setLocation("/settings/appearance")}
              className="w-full p-4 flex items-center justify-between border-b border-border hover:bg-elevated transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="font-medium">Appearance</p>
                  <p className="text-xs text-secondary">Dark mode</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-secondary" />
            </button>

            {/* Export Data */}
            <button
              onClick={() => setLocation("/settings/export")}
              className="w-full p-4 flex items-center justify-between border-b border-border hover:bg-elevated transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-gray-400 shrink-0" />
                <p className="font-medium">Export Data</p>
              </div>
              <ChevronRight size={18} className="text-secondary" />
            </button>

            {/* Privacy & Security */}
            <button
              onClick={() => toast.info("Privacy settings coming soon!")}
              className="w-full p-4 flex items-center justify-between hover:bg-elevated transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-400 shrink-0" />
                <p className="font-medium">Privacy & Security</p>
              </div>
              <ChevronRight size={18} className="text-secondary" />
            </button>
          </div>
        </section>

        <button
          onClick={handleSignOut}
          className="w-full h-14 bg-destructive/10 hover:bg-destructive/20 active:scale-95 transition-all rounded-xl text-destructive font-bold flex items-center justify-center gap-2 border border-destructive/20"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </MobileShell>
  );
}
