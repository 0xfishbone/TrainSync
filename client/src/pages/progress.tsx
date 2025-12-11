import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Loader2, ChevronDown, ChevronUp, Calendar, ArrowRight, CheckCircle2, AlertCircle, Target } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GoalProgressWidget } from "@/components/goal-progress-widget";

interface MomentumData {
  score: number;
  tier: string;
  emoji: string;
  message: string;
  color: string;
  streak: number;
  recommendedAction: string;
  breakdown: {
    workoutsCompleted: number;
    workoutsScheduled: number;
    mealsLogged: number;
    weeklyWeightChange: number;
  };
}

interface WeeklyReview {
  weightSummary: string;
  workoutSummary: string;
  nutritionSummary: string;
  patternsDetected: string[];
  recommendations: string[];
  aiSummaryText: string;
  tone: string;
}

interface WeeklyAdjustments {
  adjustments: {
    [exerciseName: string]: {
      action: string;
      from: string;
      to: string;
      reasoning: string;
    };
  };
  weeklyFocus: string;
  nutritionGuidance: string;
  restReminder: string | null;
  currentWeekNumber: number;
}

export default function Progress() {
  const [, setLocation] = useLocation();
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [weightData, setWeightData] = useState<any[]>([]);
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [adjustments, setAdjustments] = useState<WeeklyAdjustments | null>(null);
  const [isGeneratingAdjustments, setIsGeneratingAdjustments] = useState(false);
  const [isApplyingAdjustments, setIsApplyingAdjustments] = useState(false);
  const [showAdjustmentDetails, setShowAdjustmentDetails] = useState(false);
  const [goalProgress, setGoalProgress] = useState<any | null>(null);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [weekType, setWeekType] = useState<string | null>(null);

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    try {
      const userId = localStorage.getItem("trainsync_user_id");
      if (!userId) {
        setLocation("/onboarding");
        return;
      }

      // Fetch momentum score
      const momentumRes = await fetch("/api/momentum", {
        headers: { "x-user-id": userId },
      });

      if (momentumRes.ok) {
        const momentumData = await momentumRes.json();
        setMomentum(momentumData);
      }

      // Fetch weight history
      const weightRes = await fetch("/api/weight?limit=7", {
        headers: { "x-user-id": userId },
      });

      if (weightRes.ok) {
        const weights = await weightRes.json();
        const chartData = weights.reverse().map((entry: any, index: number) => ({
          name: ["S", "M", "T", "W", "T", "F", "S"][index] || "D",
          weight: entry.weight,
        }));
        setWeightData(chartData);
      }

      // Fetch goal progress
      try {
        const goalRes = await fetch("/api/goal/progress", {
          headers: { "x-user-id": userId },
        });
        if (goalRes.ok) {
          const goalData = await goalRes.json();
          setGoalProgress(goalData);
        }
      } catch (e) {
        // Goal tracking might not be set up yet
        console.log("Goal progress not available");
      }

      // Fetch patterns
      try {
        const patternsRes = await fetch("/api/patterns", {
          headers: { "x-user-id": userId },
        });
        if (patternsRes.ok) {
          const patternsData = await patternsRes.json();
          setPatterns(patternsData.interventions || []);
        }
      } catch (e) {
        // Patterns might not be available yet
        console.log("Patterns not available");
      }

      // Fetch latest performance to get week type
      try {
        const perfRes = await fetch("/api/performance/history?limit=1", {
          headers: { "x-user-id": userId },
        });
        if (perfRes.ok) {
          const perfData = await perfRes.json();
          if (perfData.length > 0) {
            setWeekType(perfData[0].weekType);
          }
        }
      } catch (e) {
        console.log("Week type not available");
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error("Error fetching progress:", error);
      setIsLoading(false);
    }
  };

  const generateWeeklyReview = async () => {
    try {
      const userId = localStorage.getItem("trainsync_user_id");
      if (!userId) return;

      setIsGeneratingReview(true);

      const response = await fetch("/api/reviews/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          weekStartDate: new Date(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate review");
      }

      const reviewData = await response.json();
      setReview(reviewData);

      toast.success("Weekly Review Generated", {
        description: "AI analyzed your performance",
      });
    } catch (error: any) {
      console.error("Error generating review:", error);
      toast.error("Failed to generate review", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsGeneratingReview(false);
    }
  };

  const generateWeeklyAdjustments = async () => {
    try {
      const userId = localStorage.getItem("trainsync_user_id");
      if (!userId) return;

      setIsGeneratingAdjustments(true);

      const response = await fetch("/api/programs/adjustments/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate adjustments");
      }

      const adjustmentsData = await response.json();
      setAdjustments(adjustmentsData);
      setShowAdjustmentDetails(true);

      toast.success("Next Week's Plan Ready", {
        description: "AI analyzed your progress",
      });
    } catch (error: any) {
      console.error("Error generating adjustments:", error);
      toast.error("Failed to generate adjustments", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsGeneratingAdjustments(false);
    }
  };

  const applyWeeklyAdjustments = async () => {
    try {
      const userId = localStorage.getItem("trainsync_user_id");
      if (!userId || !adjustments) return;

      setIsApplyingAdjustments(true);

      const response = await fetch("/api/programs/adjustments/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          adjustments: adjustments.adjustments,
          weeklyFocus: adjustments.weeklyFocus,
          nutritionGuidance: adjustments.nutritionGuidance,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to apply adjustments");
      }

      const newProgram = await response.json();

      toast.success("Program Updated!", {
        description: `Week ${newProgram.weekNumber} is now active`,
      });

      // Reset adjustments and close modal
      setAdjustments(null);
      setShowAdjustmentDetails(false);

      // Refresh data
      await fetchProgressData();
    } catch (error: any) {
      console.error("Error applying adjustments:", error);
      toast.error("Failed to apply adjustments", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsApplyingAdjustments(false);
    }
  };

  if (isLoading) {
    return (
      <MobileShell>
        <div className="p-6 pt-12 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileShell>
    );
  }

  // Helper function to get week type badge config
  const getWeekTypeBadge = (type: string | null) => {
    if (!type) return null;

    const configs: Record<string, { label: string; color: string; bgColor: string }> = {
      excellent: { label: "Excellent Week", color: "text-green-500", bgColor: "bg-green-500/10" },
      good: { label: "Good Week", color: "text-blue-500", bgColor: "bg-blue-500/10" },
      inconsistent: { label: "Inconsistent Week", color: "text-amber-500", bgColor: "bg-amber-500/10" },
      bad: { label: "Tough Week", color: "text-red-500", bgColor: "bg-red-500/10" },
      recovery: { label: "Recovery Week", color: "text-purple-500", bgColor: "bg-purple-500/10" },
    };

    return configs[type] || null;
  };

  return (
    <MobileShell>
      <div className="p-6 pt-12 space-y-6">
        <header>
          <h1 className="text-2xl font-display font-bold mb-1">Weekly Progress</h1>
          <p className="text-secondary text-sm">Track your momentum and performance</p>
        </header>

        {/* Week Type Badge */}
        {weekType && getWeekTypeBadge(weekType) && (
          <div className={cn(
            "px-4 py-2 rounded-full text-sm font-bold text-center",
            getWeekTypeBadge(weekType)?.bgColor,
            getWeekTypeBadge(weekType)?.color
          )}>
            {getWeekTypeBadge(weekType)?.label}
          </div>
        )}

        {/* Goal Progress Widget */}
        {goalProgress && (
          <GoalProgressWidget
            goalProgress={goalProgress}
            onManageGoal={() => {
              // TODO: Navigate to goal management screen
              toast("Goal management coming soon");
            }}
          />
        )}

        {/* Pattern Alerts */}
        {patterns.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-tertiary uppercase tracking-wider flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              Patterns Detected
            </h2>
            {patterns.map((pattern: any, index: number) => (
              <div
                key={index}
                className={cn(
                  "rounded-xl p-4 border",
                  pattern.severity === "high"
                    ? "bg-red-500/10 border-red-500/30"
                    : pattern.severity === "medium"
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-blue-500/10 border-blue-500/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={20}
                    className={cn(
                      pattern.severity === "high"
                        ? "text-red-500"
                        : pattern.severity === "medium"
                        ? "text-amber-500"
                        : "text-blue-500"
                    )}
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-sm mb-1">{pattern.description}</h3>
                    <p className="text-xs text-secondary mb-2">{pattern.recommendation}</p>
                    <div className="text-xs text-tertiary">
                      {pattern.weeksAffected} week{pattern.weeksAffected !== 1 ? "s" : ""} • {pattern.severity} severity
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Momentum Score - Tappable */}
        {momentum && (
          <>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="w-full bg-surface rounded-2xl p-6 border border-white/5 shadow-lg relative overflow-hidden active:scale-98 transition-transform"
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: momentum.color }} />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold text-tertiary uppercase tracking-wider">Momentum Score</h2>
                  <div className="flex items-center gap-2">
                    <div className="text-3xl">{momentum.emoji}</div>
                    {momentum.score > 0 && (
                      <>
                        {showBreakdown ? (
                          <ChevronUp size={20} className="text-secondary" />
                        ) : (
                          <ChevronDown size={20} className="text-secondary" />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {momentum.score > 0 ? (
                  <>
                    <div className="flex items-end gap-4 mb-4">
                      <div className="text-5xl font-bold" style={{ color: momentum.color }}>
                        {momentum.score}
                      </div>
                      <div className="pb-2 text-left">
                        <p className="text-lg font-bold">{momentum.message}</p>
                        <p className="text-sm text-secondary">
                          {momentum.streak} day streak 🔥
                        </p>
                      </div>
                    </div>

                    <div className="bg-elevated rounded-xl p-3">
                      <p className="text-xs text-secondary font-medium text-left">{momentum.recommendedAction}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-5xl font-bold text-tertiary">--</div>
                      <div className="text-left flex-1">
                        <p className="text-lg font-bold">Let's get started!</p>
                        <p className="text-sm text-secondary">
                          Complete workouts and log meals to build momentum
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </button>

            {/* Momentum Breakdown - Expandable (only if score > 0) */}
            {showBreakdown && momentum.score > 0 && (
              <div className="bg-elevated rounded-xl p-4 border border-border space-y-3 animate-in slide-in-from-top duration-200">
                <h3 className="text-xs font-bold text-tertiary uppercase tracking-wider mb-4">
                  Score Breakdown (Total: {momentum.score}/100)
                </h3>

                {/* Component bars */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Workouts ({momentum.breakdown.workoutsCompleted}/{momentum.breakdown.workoutsScheduled})</span>
                      <span className="font-bold">40 pts</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(momentum.breakdown.workoutsCompleted / momentum.breakdown.workoutsScheduled) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Nutrition ({momentum.breakdown.mealsLogged}/21)</span>
                      <span className="font-bold">30 pts</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full bg-warning rounded-full transition-all"
                        style={{ width: `${(momentum.breakdown.mealsLogged / 21) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Weight Progress</span>
                      <span className="font-bold">15 pts</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div className="h-full bg-success rounded-full transition-all" style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Streak ({momentum.streak} days)</span>
                      <span className="font-bold">10 pts</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${momentum.streak >= 14 ? 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Quality</span>
                      <span className="font-bold">5 pts</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div className="h-full bg-success rounded-full transition-all" style={{ width: "100%" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Week Dots */}
            <section>
              <h2 className="text-xs font-bold text-tertiary uppercase tracking-wider mb-3">
                This Week
              </h2>
              <div className="bg-surface/50 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                  const completed = i < momentum.breakdown.workoutsCompleted;
                  const today = i === momentum.breakdown.workoutsCompleted;
                  return (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full transition-colors",
                          completed ? "bg-primary" : today ? "bg-surface border-2 border-primary" : "bg-elevated"
                        )}
                      />
                      <span className="text-[10px] text-tertiary font-medium">{day}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* Weight Chart */}
        {weightData.length > 0 && (
          <section className="bg-surface rounded-2xl p-6 border border-border">
            <div className="flex justify-between items-end mb-6">
               <div>
                 <h2 className="text-xs font-bold text-secondary uppercase tracking-wider">Body Weight</h2>
                 <p className="text-3xl font-bold text-white mt-1">
                   {weightData[weightData.length - 1]?.weight || 0}{" "}
                   <span className="text-sm text-secondary font-normal">kg</span>
                 </p>
               </div>
               {momentum && momentum.breakdown.weeklyWeightChange !== 0 && (
                 <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                   momentum.breakdown.weeklyWeightChange > 0
                     ? "bg-success/10 text-success"
                     : "bg-destructive/10 text-destructive"
                 }`}>
                   {momentum.breakdown.weeklyWeightChange > 0 ? "+" : ""}
                   {momentum.breakdown.weeklyWeightChange.toFixed(1)}kg
                 </div>
               )}
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weightData}>
                  <XAxis
                    dataKey="name"
                    stroke="#636366"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#2C2C2E', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar
                    dataKey="weight"
                    fill="hsl(210 100% 52%)"
                    radius={[4, 4, 4, 4]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Weekly Review Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-tertiary uppercase tracking-wider">
              Weekly AI Review
            </h2>
            <TrendingUp size={20} className="text-primary" />
          </div>

          {!review ? (
            <div className="bg-surface rounded-2xl p-6 border border-white/5 text-center space-y-4">
              <Sparkles size={48} className="mx-auto text-primary opacity-50" />
              <div>
                <h3 className="text-lg font-bold mb-2">Get Your Weekly Insights</h3>
                <p className="text-sm text-secondary mb-4">
                  Let Gemini AI analyze your performance and provide personalized recommendations
                </p>
              </div>
              <Button
                onClick={generateWeeklyReview}
                disabled={isGeneratingReview}
                className="w-full h-12 shadow-lg shadow-primary/20"
              >
                {isGeneratingReview ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2" size={16} />
                    Generate Weekly Review
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl p-6 border border-white/5 space-y-6">
              {/* AI Summary */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <h3 className="text-xs font-bold text-tertiary uppercase tracking-wider">
                    AI Summary
                  </h3>
                </div>
                <p className="text-sm leading-relaxed">{review.aiSummaryText}</p>
              </div>

              {/* Weight Summary */}
              <div className="bg-elevated rounded-xl p-4">
                <h4 className="text-xs font-bold text-secondary mb-2 uppercase">Weight Progress</h4>
                <p className="text-sm">{review.weightSummary}</p>
              </div>

              {/* Workout Summary */}
              <div className="bg-elevated rounded-xl p-4">
                <h4 className="text-xs font-bold text-secondary mb-2 uppercase">Workout Performance</h4>
                <p className="text-sm">{review.workoutSummary}</p>
              </div>

              {/* Nutrition Summary */}
              <div className="bg-elevated rounded-xl p-4">
                <h4 className="text-xs font-bold text-secondary mb-2 uppercase">Nutrition</h4>
                <p className="text-sm">{review.nutritionSummary}</p>
              </div>

              {/* Recommendations */}
              {review.recommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-tertiary mb-3 uppercase tracking-wider">
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {review.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Regenerate button */}
              <Button
                onClick={generateWeeklyReview}
                disabled={isGeneratingReview}
                variant="outline"
                className="w-full h-10"
                size="sm"
              >
                {isGeneratingReview ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={14} />
                    Regenerating...
                  </>
                ) : (
                  "Regenerate Review"
                )}
              </Button>
            </div>
          )}
        </section>

        {/* Weekly Adjustments Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-tertiary uppercase tracking-wider">
              Next Week's Plan
            </h2>
            <Calendar size={20} className="text-primary" />
          </div>

          {!adjustments ? (
            <div className="bg-surface rounded-2xl p-6 border border-white/5 text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                {momentum && (
                  <>
                    <div className="flex gap-1">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                        const completed = i < momentum.breakdown.workoutsCompleted;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "w-2 h-2 rounded-full",
                              completed ? "bg-primary" : "bg-elevated"
                            )}
                          />
                        );
                      })}
                    </div>
                    {momentum.breakdown.weeklyWeightChange !== 0 && (
                      <span className={cn(
                        "text-sm font-bold",
                        momentum.breakdown.weeklyWeightChange > 0 ? "text-success" : "text-destructive"
                      )}>
                        {momentum.breakdown.weeklyWeightChange > 0 ? "+" : ""}
                        {momentum.breakdown.weeklyWeightChange.toFixed(1)}kg
                      </span>
                    )}
                  </>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">Ready for Next Week?</h3>
                <p className="text-sm text-secondary mb-4">
                  AI will analyze your performance and create a personalized plan
                </p>
              </div>
              <Button
                onClick={generateWeeklyAdjustments}
                disabled={isGeneratingAdjustments}
                className="w-full h-12 shadow-lg shadow-primary/20"
              >
                {isGeneratingAdjustments ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2" size={16} />
                    Generate Next Week's Plan
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl p-6 border border-white/5 space-y-4">
              {/* Week Info */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-lg font-bold">Week {adjustments.currentWeekNumber + 1}</h3>
                  <p className="text-sm text-secondary">AI-adjusted program</p>
                </div>
                <div className="text-primary">
                  <Sparkles size={24} />
                </div>
              </div>

              {/* Weekly Focus */}
              <div className="bg-elevated rounded-xl p-4">
                <h4 className="text-xs font-bold text-secondary mb-2 uppercase">This Week's Focus</h4>
                <p className="text-sm">{adjustments.weeklyFocus}</p>
              </div>

              {/* Adjustments Summary */}
              <div>
                <button
                  onClick={() => setShowAdjustmentDetails(!showAdjustmentDetails)}
                  className="w-full flex items-center justify-between bg-elevated rounded-xl p-4 hover:bg-surface transition-colors"
                >
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-secondary mb-1 uppercase">Program Changes</h4>
                    <p className="text-sm">
                      {Object.keys(adjustments.adjustments).length} exercise{Object.keys(adjustments.adjustments).length !== 1 ? 's' : ''} adjusted
                    </p>
                  </div>
                  {showAdjustmentDetails ? (
                    <ChevronUp size={20} className="text-secondary" />
                  ) : (
                    <ChevronDown size={20} className="text-secondary" />
                  )}
                </button>

                {/* Detailed Adjustments */}
                {showAdjustmentDetails && (
                  <div className="mt-3 space-y-2">
                    {Object.entries(adjustments.adjustments).map(([exerciseName, adjustment]) => (
                      <div
                        key={exerciseName}
                        className="bg-elevated rounded-lg p-3 border border-border"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-bold text-sm">{exerciseName}</h5>
                          <div className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full",
                            adjustment.action.includes("increase") ? "bg-success/10 text-success" :
                            adjustment.action === "maintain" ? "bg-primary/10 text-primary" :
                            "bg-warning/10 text-warning"
                          )}>
                            {adjustment.action.replace(/_/g, ' ').toUpperCase()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2 text-sm">
                          <span className="text-secondary">{adjustment.from}</span>
                          <ArrowRight size={14} className="text-tertiary" />
                          <span className="font-bold">{adjustment.to}</span>
                        </div>
                        <p className="text-xs text-secondary">{adjustment.reasoning}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nutrition Guidance */}
              {adjustments.nutritionGuidance && (
                <div className="bg-warning/10 rounded-xl p-4 border border-warning/20">
                  <h4 className="text-xs font-bold text-warning mb-2 uppercase">Nutrition</h4>
                  <p className="text-sm">{adjustments.nutritionGuidance}</p>
                </div>
              )}

              {/* Rest Reminder */}
              {adjustments.restReminder && (
                <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                  <h4 className="text-xs font-bold text-destructive mb-2 uppercase">⚠️ Important</h4>
                  <p className="text-sm">{adjustments.restReminder}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={applyWeeklyAdjustments}
                  disabled={isApplyingAdjustments}
                  className="flex-1 h-12 shadow-lg shadow-primary/20"
                >
                  {isApplyingAdjustments ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2" size={16} />
                      Apply Changes
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setAdjustments(null)}
                  variant="outline"
                  className="h-12"
                  disabled={isApplyingAdjustments}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </MobileShell>
  );
}
