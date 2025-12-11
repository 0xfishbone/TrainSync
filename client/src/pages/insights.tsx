import { useState, useEffect } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { TrendingUp, Calendar, Flame, Target, Award, BarChart3 } from "lucide-react";
import { getMomentumTier } from "@shared/utils/momentum";

interface WeeklyStats {
  weekStartDate: string;
  weekEndDate: string;
  momentumScore: number;
  workoutsCompleted: number;
  workoutsPlanned: number;
  nutritionDaysHitTarget: number;
  weightChange: number | null;
  currentStreak: number;
}

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyStats[]>([]);
  const [currentWeek, setCurrentWeek] = useState<WeeklyStats | null>(null);

  useEffect(() => {
    fetchWeeklyHistory();
  }, []);

  async function fetchWeeklyHistory() {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        console.error("No user ID found");
        setLoading(false);
        return;
      }

      // Fetch weekly performance history
      const response = await fetch("/api/performance/history", {
        headers: { "x-user-id": userId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch weekly history");
      }

      const history = await response.json();

      // Sort by week start date (most recent first)
      const sorted = history.sort(
        (a: WeeklyStats, b: WeeklyStats) =>
          new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()
      );

      setWeeklyHistory(sorted);
      setCurrentWeek(sorted[0] || null);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching weekly history:", error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <MobileShell>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-secondary">Loading insights...</p>
          </div>
        </div>
      </MobileShell>
    );
  }

  const momentum = currentWeek
    ? getMomentumTier(currentWeek.momentumScore)
    : { emoji: "📈", message: "Start tracking to see insights", color: "#8b5cf6" };

  const workoutRate = currentWeek
    ? Math.round((currentWeek.workoutsCompleted / currentWeek.workoutsPlanned) * 100)
    : 0;

  const nutritionRate = currentWeek
    ? Math.round((currentWeek.nutritionDaysHitTarget / 7) * 100)
    : 0;

  return (
    <MobileShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-display font-bold">Insights</h1>
          <p className="text-secondary">Your performance trends and analytics</p>
        </header>

        {currentWeek ? (
          <>
            {/* Current Week Overview */}
            <section className="bg-elevated rounded-2xl p-6 border border-border/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">This Week</h2>
                <div className="text-sm text-secondary">
                  {new Date(currentWeek.weekStartDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(currentWeek.weekEndDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>

              {/* Momentum Score */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="text-6xl font-bold"
                  style={{ color: momentum.color }}
                >
                  {currentWeek.momentumScore}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold">{momentum.message}</p>
                  <p className="text-sm text-secondary mt-1">
                    {momentum.emoji} Momentum Score
                  </p>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface rounded-xl p-4 border border-border/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={18} className="text-primary" />
                    <span className="text-sm text-secondary">Workouts</span>
                  </div>
                  <div className="text-2xl font-bold">{workoutRate}%</div>
                  <p className="text-xs text-secondary mt-1">
                    {currentWeek.workoutsCompleted}/{currentWeek.workoutsPlanned} completed
                  </p>
                </div>

                <div className="bg-surface rounded-xl p-4 border border-border/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Award size={18} className="text-primary" />
                    <span className="text-sm text-secondary">Nutrition</span>
                  </div>
                  <div className="text-2xl font-bold">{nutritionRate}%</div>
                  <p className="text-xs text-secondary mt-1">
                    {currentWeek.nutritionDaysHitTarget}/7 days on target
                  </p>
                </div>

                <div className="bg-surface rounded-xl p-4 border border-border/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame size={18} className="text-orange-500" />
                    <span className="text-sm text-secondary">Streak</span>
                  </div>
                  <div className="text-2xl font-bold">{currentWeek.currentStreak}</div>
                  <p className="text-xs text-secondary mt-1">days active</p>
                </div>

                <div className="bg-surface rounded-xl p-4 border border-border/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={18} className="text-green-500" />
                    <span className="text-sm text-secondary">Weight</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {currentWeek.weightChange !== null
                      ? `${currentWeek.weightChange > 0 ? "+" : ""}${currentWeek.weightChange.toFixed(1)}`
                      : "--"}
                  </div>
                  <p className="text-xs text-secondary mt-1">kg this week</p>
                </div>
              </div>
            </section>

            {/* Weekly Trend Chart */}
            {weeklyHistory.length > 1 && (
              <section className="bg-elevated rounded-2xl p-6 border border-border/30">
                <h2 className="text-lg font-bold mb-4">Momentum Trend</h2>
                <div className="space-y-3">
                  {weeklyHistory.slice(0, 8).map((week, index) => {
                    const weekMomentum = getMomentumTier(week.momentumScore);
                    const isCurrentWeek = index === 0;

                    return (
                      <div
                        key={week.weekStartDate}
                        className={`flex items-center gap-3 ${
                          isCurrentWeek ? "opacity-100" : "opacity-60"
                        }`}
                      >
                        <div className="text-xs text-secondary w-16">
                          {new Date(week.weekStartDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>

                        <div className="flex-1 relative">
                          <div className="h-8 bg-surface rounded-full overflow-hidden border border-border/20">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${week.momentumScore}%`,
                                backgroundColor: weekMomentum.color,
                              }}
                            />
                          </div>
                        </div>

                        <div className="w-12 text-right">
                          <span className="text-sm font-bold" style={{ color: weekMomentum.color }}>
                            {week.momentumScore}
                          </span>
                        </div>

                        {isCurrentWeek && (
                          <div className="text-xs font-medium text-primary">Now</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Weekly Breakdown */}
            <section className="bg-elevated rounded-2xl p-6 border border-border/30">
              <h2 className="text-lg font-bold mb-4">Weekly Breakdown</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Workout Completion</span>
                  <span className="font-semibold">
                    {currentWeek.workoutsCompleted} / {currentWeek.workoutsPlanned}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Nutrition Days On Target</span>
                  <span className="font-semibold">
                    {currentWeek.nutritionDaysHitTarget} / 7
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Current Streak</span>
                  <span className="font-semibold">{currentWeek.currentStreak} days</span>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="bg-elevated rounded-2xl p-8 border border-border/30 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Data Yet</h2>
            <p className="text-secondary">
              Complete workouts and log meals to see your insights and trends
            </p>
          </section>
        )}
      </div>
    </MobileShell>
  );
}
