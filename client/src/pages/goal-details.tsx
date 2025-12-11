import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ChevronLeft, TrendingDown, TrendingUp, Target, Calendar, Edit } from "lucide-react";
import { toast } from "sonner";
import { GoalProgressWidget } from "@/components/goal-progress-widget";

interface ProfileData {
  name: string;
  age: number;
  currentWeight: number;
  primaryGoal: string;
  targetWeightMin?: number;
  targetWeightMax?: number;
  weeklyWeightChangeTarget: number;
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

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  notes?: string;
}

export default function GoalDetails() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgressWidgetData | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("trainsync_user_id");
    if (!userId) {
      setLocation("/onboarding");
      return;
    }

    // Fetch profile and goal progress
    fetch("/api/profile", {
      headers: { "x-user-id": userId },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Profile not found");
        const data = await res.json();
        const profileData: ProfileData = {
          name: data.name,
          age: data.age,
          currentWeight: data.currentWeight,
          primaryGoal: data.primaryGoal,
          targetWeightMin: data.targetWeightMin,
          targetWeightMax: data.targetWeightMax,
          weeklyWeightChangeTarget: data.weeklyWeightChangeTarget,
        };
        setProfile(profileData);

        // Fetch goal progress
        return fetch("/api/goal/progress", {
          headers: { "x-user-id": userId },
        }).then(async (goalRes) => {
          if (goalRes.ok) {
            const goalData: GoalProgressAPI = await goalRes.json();
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
        });
      })
      .catch((err) => {
        console.error("Failed to load data", err);
        toast.error("Failed to load goal details");
      })
      .finally(() => setIsLoading(false));

    // Fetch weight history for chart
    fetch("/api/weight?limit=30", {
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
      });
  }, [setLocation]);

  return (
    <MobileShell hideNav={true}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <button
              onClick={() => setLocation("/profile")}
              className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-border active:scale-95 transition-transform"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-xl font-display font-bold">Goal Progress</h1>
          </div>
        </header>

        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-secondary">Loading...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Goal Progress Widget */}
            {goalProgress && (
              <GoalProgressWidget
                goalProgress={goalProgress}
                onManageGoal={() => {
                  toast.info("Goal adjustment coming soon!");
                }}
              />
            )}

            {/* Goal Details Card */}
            {profile && goalProgress && (
              <div className="bg-surface rounded-2xl p-5 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={18} className="text-primary" />
                    <h2 className="font-bold">Goal Details</h2>
                  </div>
                  <button
                    onClick={() => toast.info("Edit goal coming soon!")}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-tertiary mb-1">Target Weight</p>
                    <p className="font-bold">
                      {profile.targetWeightMin && profile.targetWeightMax
                        ? profile.targetWeightMin === profile.targetWeightMax
                          ? `${profile.targetWeightMin.toFixed(1)} kg`
                          : `${profile.targetWeightMin.toFixed(1)}-${profile.targetWeightMax.toFixed(1)} kg`
                        : "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-tertiary mb-1">Weekly Rate</p>
                    <p className="font-bold flex items-center gap-1">
                      {profile.weeklyWeightChangeTarget > 0 ? (
                        <TrendingUp size={16} className="text-green-500" />
                      ) : profile.weeklyWeightChangeTarget < 0 ? (
                        <TrendingDown size={16} className="text-blue-500" />
                      ) : (
                        <Target size={16} className="text-secondary" />
                      )}
                      {Math.abs(profile.weeklyWeightChangeTarget).toFixed(2)} kg/week
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-tertiary mb-1">Current Weight</p>
                    <p className="font-bold">{profile.currentWeight.toFixed(1)} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-tertiary mb-1">Progress</p>
                    <p className="font-bold">{goalProgress.progressPercent.toFixed(0)}%</p>
                  </div>
                </div>

                {goalProgress.daysToGoal && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-tertiary mb-1">Estimated Time Remaining</p>
                    <p className="font-bold text-lg">
                      {Math.round(goalProgress.daysToGoal / 7)} weeks
                      <span className="text-secondary font-normal text-sm ml-2">
                        ({goalProgress.daysToGoal} days)
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Weight History */}
            <div className="bg-surface rounded-2xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-bold flex items-center gap-2">
                  <Calendar size={18} className="text-primary" />
                  Weight History
                </h2>
              </div>

              {weightHistory.length === 0 ? (
                <div className="p-8 text-center">
                  <Target size={32} className="mx-auto text-secondary mb-2" />
                  <p className="text-secondary">No weight entries yet</p>
                  <button
                    onClick={() => setLocation("/progress")}
                    className="text-primary font-medium hover:underline text-sm mt-2"
                  >
                    Log your first weigh-in
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {weightHistory.map((entry, index) => {
                    const prevWeight = weightHistory[index + 1]?.weight;
                    const change = prevWeight ? entry.weight - prevWeight : null;
                    const entryDate = new Date(entry.date);
                    const formattedDate = entryDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: entryDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    });

                    return (
                      <div key={entry.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold">{entry.weight.toFixed(1)} kg</p>
                          <p className="text-xs text-secondary">{formattedDate}</p>
                        </div>
                        {change !== null && (
                          <div className={`text-sm font-medium flex items-center gap-1 ${
                            change > 0 ? 'text-green-500' : change < 0 ? 'text-blue-500' : 'text-secondary'
                          }`}>
                            {change > 0 ? (
                              <TrendingUp size={14} />
                            ) : change < 0 ? (
                              <TrendingDown size={14} />
                            ) : null}
                            {change > 0 ? '+' : ''}{change.toFixed(1)} kg
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
