import { MobileShell } from "@/components/layout/mobile-shell";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Link, useLocation } from "wouter";
import {
  ChevronRight,
  Plus,
  User,
  X,
  Check,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Target
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SaturdayWeighInModal } from "@/components/saturday-weighin-modal";
import { BadWeekContextModal } from "@/components/bad-week-context-modal";

interface NutritionToday {
  caloriesTarget: number;
  proteinTarget: number;
  caloriesActual: number;
  proteinActual: number;
}

interface MomentumSummary {
  score: number;
  emoji: string;
  message: string;
}

interface GoalSummary {
  currentWeight: number;
  targetWeightMin: number;
  targetWeightMax: number;
  progressPercent: number;
  remainingChange: number;
}

interface Exercise {
  name: string;
  type: "timed" | "reps";
  sets?: number;
  reps?: string;
  rounds?: number;
  completed?: boolean;
  completedAt?: string;
}

interface CompletedExercise {
  exerciseName: string;
  completedAt: string;
  feeling: string | null;
  sets: number | null;
  weight: number | null;
}

interface TodaysTraining {
  sessionName: string;
  durationLabel: string;
  intensityLabel: string;
  hasWorkout: boolean;
  exercises: Exercise[];
  currentExerciseIndex: number;
}

export default function Home() {
  const today = new Date();
  const [, setLocation] = useLocation();
  const [showWeighIn, setShowWeighIn] = useState(false);
  const [expandedExerciseList, setExpandedExerciseList] = useState(false);
  const [weight, setWeight] = useState<string>("");
  const [nutrition, setNutrition] = useState<NutritionToday | null>(null);
  const [momentum, setMomentum] = useState<MomentumSummary | null>(null);
  const [goalSummary, setGoalSummary] = useState<GoalSummary | null>(null);
  const [training, setTraining] = useState<TodaysTraining>({
    sessionName: "",
    durationLabel: "",
    intensityLabel: "",
    hasWorkout: false,
    exercises: [],
    currentExerciseIndex: 0,
  });

  // Saturday weigh-in flow state
  const [showSaturdayWeighIn, setShowSaturdayWeighIn] = useState(false);
  const [showBadWeekContext, setShowBadWeekContext] = useState(false);
  const [lastWeekWeight, setLastWeekWeight] = useState<number | null>(null);
  const [targetWeightChange, setTargetWeightChange] = useState<number>(0);

  useEffect(() => {
    const userId = localStorage.getItem("trainsync_user_id");
    if (!userId) return;

    // Check if Saturday weigh-in is required (priority check)
    fetch("/api/weighin/required", {
      headers: { "x-user-id": userId },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();

        if (data.required) {
          // Get last week's weight for reference
          fetch("/api/weight/latest", {
            headers: { "x-user-id": userId },
          })
            .then(async (weightRes) => {
              if (weightRes.ok) {
                const weightData = await weightRes.json();
                setLastWeekWeight(weightData.weight || null);
              }
            })
            .catch(() => {});

          // Get target weight change from profile
          fetch("/api/profile", {
            headers: { "x-user-id": userId },
          })
            .then(async (profileRes) => {
              if (profileRes.ok) {
                const profileData = await profileRes.json();
                setTargetWeightChange(profileData.weeklyWeightChangeTarget || 0);
              }
            })
            .catch(() => {});

          // Show Saturday weigh-in modal (blocks navigation)
          setShowSaturdayWeighIn(true);
        } else if (data.badWeekContextRequired) {
          // Show bad week context modal after weigh-in
          setShowBadWeekContext(true);
        }
      })
      .catch((err) => {
        console.log("Weigh-in check failed", err);
      });

    // Fetch latest weight (with fallback to profile currentWeight)
    fetch("/api/weight/latest", {
      headers: { "x-user-id": userId },
    })
      .then(async (res) => {
        if (!res.ok) {
          // No weight entries yet, fall back to profile's currentWeight
          return fetch("/api/profile", {
            headers: { "x-user-id": userId },
          }).then(async (profileRes) => {
            if (profileRes.ok) {
              const profile = await profileRes.json();
              if (typeof profile.currentWeight === "number") {
                setWeight(profile.currentWeight.toFixed(1));
              }
            }
          });
        }
        const data = await res.json();
        if (typeof data.weight === "number") {
          setWeight(data.weight.toFixed(1));
        }
      })
      .catch(() => {
        // ignore, user may not have any weight yet
      });

    // Fetch today's nutrition summary
    fetch("/api/nutrition/today", {
      headers: { "x-user-id": userId },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setNutrition({
          caloriesTarget: data.caloriesTarget,
          proteinTarget: data.proteinTarget,
          caloriesActual: data.caloriesActual,
          proteinActual: data.proteinActual,
        });
      })
      .catch((err) => {
        console.error("Failed to load nutrition", err);
      });

    // Fetch momentum score (for brief's home glanceable metric)
    fetch("/api/momentum", {
      headers: { "x-user-id": userId },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setMomentum({
          score: data.score,
          emoji: data.emoji,
          message: data.message,
        });
      })
      .catch((err) => {
        console.error("Failed to load momentum", err);
      });

    // Fetch goal summary for compressed widget
    Promise.all([
      fetch("/api/profile", { headers: { "x-user-id": userId }}),
      fetch("/api/goal/progress", { headers: { "x-user-id": userId }})
    ])
      .then(async ([profileRes, goalRes]) => {
        if (profileRes.ok && goalRes.ok) {
          const profile = await profileRes.json();
          const goal = await goalRes.json();

          setGoalSummary({
            currentWeight: profile.currentWeight,
            targetWeightMin: profile.targetWeightMin || profile.currentWeight,
            targetWeightMax: profile.targetWeightMax || profile.currentWeight,
            progressPercent: goal.progressPercent,
            remainingChange: goal.remainingChange,
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load goal summary", err);
      });

    // Fetch today's training from current program
    fetch("/api/programs/current", {
      headers: { "x-user-id": userId },
    })
      .then(async (res) => {
        if (res.status === 404) {
          return;
        }
        if (!res.ok) return;
        const program = await res.json();
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const todayKey = days[new Date().getDay()];
        const todaysWorkout = program.workouts?.[todayKey];
        if (!todaysWorkout) return;

        const exercises = (todaysWorkout.exercises || []).map((ex: any) => ({
          name: ex.name,
          type: ex.type || "reps",
          sets: ex.sets,
          reps: ex.reps,
          rounds: ex.rounds,
          completed: false,
          completedAt: undefined,
        }));

        // Fetch today's completed exercises from API (not localStorage)
        fetch("/api/workouts/today", {
          headers: { "x-user-id": userId },
        })
          .then(async (completedRes) => {
            if (completedRes.ok) {
              const completedData = await completedRes.json();
              const completedExercises: CompletedExercise[] = completedData.completed || [];

              // Mark exercises as completed based on API data
              let currentIndex = 0;
              for (let i = 0; i < exercises.length; i++) {
                const matchingCompletion = completedExercises.find(
                  (ce) => ce.exerciseName === exercises[i].name
                );
                if (matchingCompletion) {
                  exercises[i].completed = true;
                  exercises[i].completedAt = matchingCompletion.completedAt;
                  currentIndex = i + 1;
                }
              }

              const exerciseCount = exercises.length;
              setTraining({
                sessionName: todaysWorkout.sessionName || "Today's Session",
                durationLabel: todaysWorkout.durationLabel || "~50-60 min",
                intensityLabel: todaysWorkout.intensity || `${exerciseCount} exercises`,
                hasWorkout: true,
                exercises,
                currentExerciseIndex: currentIndex,
              });
            } else {
              // No completions yet, use default
              const exerciseCount = exercises.length;
              setTraining({
                sessionName: todaysWorkout.sessionName || "Today's Session",
                durationLabel: todaysWorkout.durationLabel || "~50-60 min",
                intensityLabel: todaysWorkout.intensity || `${exerciseCount} exercises`,
                hasWorkout: true,
                exercises,
                currentExerciseIndex: 0,
              });
            }
          })
          .catch(() => {
            // Fallback if API fails
            const exerciseCount = exercises.length;
            setTraining({
              sessionName: todaysWorkout.sessionName || "Today's Session",
              durationLabel: todaysWorkout.durationLabel || "~50-60 min",
              intensityLabel: todaysWorkout.intensity || `${exerciseCount} exercises`,
              hasWorkout: true,
              exercises,
              currentExerciseIndex: 0,
            });
          });
      })
      .catch((err) => {
        console.error("Failed to load today's training", err);
      });
  }, []);

  const handleWeightSave = () => {
    const userId = localStorage.getItem("trainsync_user_id");
    if (!userId) {
      toast.error("Please complete onboarding first");
      return;
    }

    const numeric = parseFloat(weight);
    if (Number.isNaN(numeric)) {
      toast.error("Enter a valid weight");
      return;
    }

    fetch("/api/weight", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({ weight: numeric, date: new Date().toISOString() }),
    }).catch((err) => {
      console.error("Failed to save weight", err);
    });

    setShowWeighIn(false);
    toast.success("Weight Updated", {
      description: `New weight: ${weight}kg`,
    });
  };

  const handleSaturdayWeighInComplete = async (newWeight: number, notes?: string) => {
    const userId = localStorage.getItem("trainsync_user_id");
    if (!userId) return;

    try {
      // Save weight entry
      await fetch("/api/weight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          weight: newWeight,
          date: new Date().toISOString(),
          notes,
        }),
      });

      setWeight(newWeight.toFixed(1));
      setShowSaturdayWeighIn(false);

      toast.success("Saturday Weigh-In Logged", {
        description: `Weight: ${newWeight}kg`,
      });

      // Check if bad week context is needed
      const requirementRes = await fetch("/api/weighin/required", {
        headers: { "x-user-id": userId },
      });

      if (requirementRes.ok) {
        const data = await requirementRes.json();
        if (data.badWeekContextRequired) {
          setShowBadWeekContext(true);
        }
      }
    } catch (error) {
      console.error("Failed to save Saturday weigh-in", error);
      toast.error("Failed to save weight");
    }
  };

  const handleBadWeekContextComplete = async (reasons: string[], notes?: string) => {
    const userId = localStorage.getItem("trainsync_user_id");
    if (!userId) return;

    try {
      // Get last week's performance ID
      const perfRes = await fetch("/api/performance/history?limit=1", {
        headers: { "x-user-id": userId },
      });

      if (perfRes.ok) {
        const perfData = await perfRes.json();
        if (perfData.length > 0) {
          const performanceId = perfData[0].id;

          // Save bad week context
          await fetch(`/api/performance/${performanceId}/context`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": userId,
            },
            body: JSON.stringify({ reasons, notes }),
          });

          toast.success("Context Saved", {
            description: "Thank you for sharing what happened",
          });
        }
      }

      setShowBadWeekContext(false);
    } catch (error) {
      console.error("Failed to save bad week context", error);
      toast.error("Failed to save context");
    }
  };

  const handleBadWeekContextSkip = () => {
    setShowBadWeekContext(false);
    toast("Context skipped", {
      description: "You can add context later in Insights",
    });
  };

  return (
    <MobileShell>
      <div className="p-6 space-y-8 pt-12 relative">
        {/* Saturday Weigh-In Modal (Mandatory - Blocks Navigation) */}
        {showSaturdayWeighIn && (
          <SaturdayWeighInModal
            onWeighInComplete={handleSaturdayWeighInComplete}
            lastWeight={lastWeekWeight}
            targetWeightChange={targetWeightChange}
          />
        )}

        {/* Bad Week Context Modal */}
        {showBadWeekContext && (
          <BadWeekContextModal
            onComplete={handleBadWeekContextComplete}
            onSkip={handleBadWeekContextSkip}
          />
        )}

        {/* Weigh-in Modal Overlay */}
        {showWeighIn && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-xs rounded-2xl p-6 border border-border shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Log Weight</h3>
                <button onClick={() => setShowWeighIn(false)} className="p-2 hover:bg-elevated rounded-full">
                  <X size={20} className="text-secondary" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 mb-8">
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="bg-transparent text-5xl font-bold text-center w-32 focus:outline-none border-b-2 border-primary pb-2"
                  autoFocus
                />
                <span className="text-xl text-secondary font-medium mt-4">kg</span>
              </div>

              <button
                onClick={handleWeightSave}
                className="w-full h-12 bg-primary rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Check size={20} />
                Save Entry
              </button>
            </div>
          </div>
        )}


        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-sm font-medium text-tertiary uppercase tracking-wider">
              {format(today, "EEEE, MMM d")}
            </h1>
            <div 
              onClick={() => setShowWeighIn(true)}
              className="flex items-center gap-2 mt-1 cursor-pointer active:opacity-70 transition-opacity"
            >
              <span className="text-2xl font-display font-bold">
                {weight ? `${weight} kg` : "-- kg"}
              </span>
              {weight && (
                <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                  Logged
                </span>
              )}
            </div>
          </div>
          <Link href="/profile">
            <button className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-border active:scale-95 transition-transform">
              <User size={20} className="text-secondary" />
            </button>
          </Link>
        </header>

        {/* Time-based Nutrition Alerts */}
        {nutrition && (() => {
          const hour = new Date().getHours();
          const calories = nutrition.caloriesActual;
          const target = nutrition.caloriesTarget;
          const percentage = target > 0 ? (calories / target) * 100 : 0;

          // Don't show alerts during quiet hours (9pm - 6am)
          if (hour < 6 || hour >= 21) return null;

          // Morning alert (9am): No breakfast logged
          if (hour === 9 && calories === 0) {
            return (
              <section className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-warning mb-1">No meals logged today</h3>
                  <p className="text-sm text-secondary">Start your day right with a nutritious breakfast</p>
                </div>
              </section>
            );
          }

          // Afternoon alert (1pm): Low calories for lunchtime
          if (hour >= 13 && hour < 17 && calories < 800) {
            return (
              <section className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-warning mb-1">Behind on calories</h3>
                  <p className="text-sm text-secondary">
                    {calories} / {target} cal ({percentage.toFixed(0)}%) · Need {target - calories} more today
                  </p>
                </div>
              </section>
            );
          }

          // Evening alert (6pm): Critical low before potential workout
          if (hour >= 18 && hour < 21 && calories < 1500) {
            return (
              <section className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-destructive mb-1">Low fuel warning</h3>
                  <p className="text-sm text-secondary">
                    Only {calories} cal today ({percentage.toFixed(0)}%) · {training.hasWorkout ? 'Training soon - eat now!' : 'Need 500+ cal before bed'}
                  </p>
                </div>
              </section>
            );
          }

          // End of day reminder (8pm): Below 70% of target
          if (hour >= 20 && hour < 21 && percentage < 70) {
            return (
              <section className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3">
                <BarChart3 className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-primary mb-1">Falling short today</h3>
                  <p className="text-sm text-secondary">
                    {calories} / {target} cal ({percentage.toFixed(0)}%) · Add a snack before bed?
                  </p>
                </div>
              </section>
            );
          }

          return null;
        })()}

        {/* Momentum glance (minimal) */}
        {momentum && (
          <section>
            {momentum.score > 0 ? (
              <div className="flex items-baseline gap-3">
                <div className="text-4xl font-display font-bold">
                  {momentum.emoji} {momentum.score}
                </div>
                <p className="text-sm text-secondary">{momentum.message}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-4xl font-display font-bold text-tertiary">
                  --
                </div>
                <p className="text-sm text-secondary">Start your first workout to build momentum!</p>
              </div>
            )}
          </section>
        )}

        {/* Compressed Goal Widget */}
        {goalSummary && (
          <button
            onClick={() => setLocation("/goal-details")}
            className="w-full bg-surface/50 hover:bg-surface rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-all active:scale-[0.98] text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs text-tertiary uppercase tracking-wider mb-1">GOAL</p>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {Math.abs(goalSummary.remainingChange).toFixed(1)} kg left
                    </span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1 h-3 rounded-full",
                            i < Math.round((goalSummary.progressPercent / 100) * 12)
                              ? "bg-primary"
                              : "bg-elevated"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-secondary">
                      {goalSummary.progressPercent.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-secondary" />
            </div>
          </button>
        )}

        {/* Today's Training Card */}
        <section>
          <h2 className="text-xs font-bold text-tertiary uppercase tracking-wider mb-3">
            Today's Training
          </h2>

          {training.hasWorkout ? (
            <>
              <div className="bg-surface rounded-2xl p-5 shadow-lg border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {training.sessionName}
                      </h3>
                      <p className="text-secondary text-sm">
                        {training.durationLabel} • {training.intensityLabel}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedExerciseList(!expandedExerciseList)}
                      className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 active:scale-95 transition-all"
                    >
                      <ChevronRight
                        size={24}
                        className={cn(
                          "transition-transform duration-200",
                          expandedExerciseList ? "rotate-90" : ""
                        )}
                      />
                    </button>
                  </div>

                  {/* Completed exercises minimal view */}
                  {training.exercises.filter(ex => ex.completed).length > 0 && (
                    <div className="mb-4 bg-elevated rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-success">
                        <Check size={16} />
                        <span className="font-medium">
                          {training.exercises.filter(ex => ex.completed).length} of {training.exercises.length} completed
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Progress bars showing actual completion */}
                  <div className="flex gap-2 mb-6">
                    {training.exercises.slice(0, 4).map((exercise, idx) => (
                      <div key={idx} className="h-1.5 flex-1 rounded-full bg-elevated overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            exercise.completed ? "bg-success w-full" :
                            idx === training.exercises.findIndex(ex => !ex.completed) ? "bg-primary w-full" :
                            "bg-transparent w-0"
                          )}
                        />
                      </div>
                    ))}
                    {training.exercises.length > 4 && (
                      <div className="text-xs text-secondary font-medium">
                        +{training.exercises.length - 4}
                      </div>
                    )}
                  </div>

                  <Link href="/workout">
                    <button
                      disabled={training.currentExerciseIndex >= training.exercises.length}
                      className={cn(
                        "w-full h-14 rounded-xl font-bold text-lg shadow-lg transition-all",
                        training.currentExerciseIndex >= training.exercises.length
                          ? "bg-elevated text-secondary cursor-not-allowed"
                          : "bg-primary hover:bg-blue-600 active:scale-95 text-white shadow-primary/20"
                      )}
                    >
                      {training.currentExerciseIndex >= training.exercises.length
                        ? "Workout Complete"
                        : training.currentExerciseIndex === 0
                          ? "Start Workout"
                          : "Continue Workout"}
                    </button>
                  </Link>
                </div>
              </div>

              {/* Inline Expanded Exercise List */}
              {expandedExerciseList && (
                <div className="mt-4 bg-elevated rounded-2xl border border-border overflow-hidden animate-in slide-in-from-top duration-300">
                  <div className="p-4 border-b border-border">
                    <p className="text-sm text-secondary">
                      {training.exercises.filter(ex => ex.completed).length} of {training.exercises.length} exercises complete
                    </p>
                  </div>

                  <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                    {training.exercises.map((exercise, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "rounded-xl p-4 border transition-all",
                          exercise.completed
                            ? "bg-success/5 border-success/20"
                            : idx === training.currentExerciseIndex
                              ? "bg-primary/10 border-primary/30"
                              : "bg-surface border-border"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Status Indicator */}
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                            exercise.completed
                              ? "bg-success/20 text-success"
                              : idx === training.currentExerciseIndex
                                ? "bg-primary/20 text-primary"
                                : "bg-elevated text-tertiary"
                          )}>
                            {exercise.completed ? (
                              <Check size={18} />
                            ) : (
                              <span className="text-sm font-bold">{idx + 1}</span>
                            )}
                          </div>

                          {/* Exercise Details */}
                          <div className="flex-1">
                            <h4 className="font-bold text-base mb-1">{exercise.name}</h4>
                            <p className="text-sm text-secondary">
                              {exercise.type === "timed"
                                ? `${exercise.rounds} rounds`
                                : `${exercise.sets} sets × ${exercise.reps} reps`}
                            </p>
                            {exercise.completed && exercise.completedAt && (
                              <p className="text-xs text-success mt-1">
                                Completed {new Date(exercise.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>

                          {/* Current Badge */}
                          {idx === training.currentExerciseIndex && !exercise.completed && (
                            <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold">
                              NEXT
                            </div>
                          )}
                          {exercise.completed && (
                            <div className="px-3 py-1 rounded-full bg-success/20 text-success text-xs font-bold">
                              ✓ DONE
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-surface rounded-2xl p-5 border border-dashed border-border text-center space-y-3">
              <h3 className="text-base font-semibold">No program yet</h3>
              <p className="text-sm text-secondary">
                Complete onboarding to generate your personalized training plan.
              </p>
              <Link href="/onboarding">
                <button className="mt-2 w-full h-12 bg-primary hover:bg-blue-600 active:scale-95 transition-all rounded-xl text-white font-bold text-sm shadow-lg shadow-primary/20">
                  Start Onboarding
                </button>
              </Link>
            </div>
          )}
        </section>

        {/* Nutrition Today Card */}
        <section>
          <h2 className="text-xs font-bold text-tertiary uppercase tracking-wider mb-3">
            Nutrition Today
          </h2>
          <div className="bg-surface rounded-2xl p-5 shadow-lg border border-white/5">
            <div className="flex items-center gap-6">
              <CircularProgress 
                value={
                  nutrition
                    ? Math.min(
                        100,
                        (nutrition.caloriesActual / nutrition.caloriesTarget) * 100 || 0,
                      )
                    : 0
                }
                size={100} 
                strokeWidth={8} 
                trackColor="text-elevated"
                color="text-warning"
              >
                <div className="text-center">
                  <span className="text-xs text-tertiary block">Left</span>
                  <span className="text-xl font-bold text-white">
                    {nutrition
                      ? Math.max(nutrition.caloriesTarget - nutrition.caloriesActual, 0)
                      : 0}
                  </span>
                </div>
              </CircularProgress>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-secondary">Calories</span>
                    <span className="font-bold">
                      {nutrition
                        ? `${nutrition.caloriesActual} / ${nutrition.caloriesTarget}`
                        : "0 / 0"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-elevated overflow-hidden">
                    <div
                      className="h-full bg-warning rounded-full"
                      style={{
                        width: `${
                          nutrition
                            ? Math.min(
                                100,
                                (nutrition.caloriesActual / nutrition.caloriesTarget) * 100 ||
                                  0,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-secondary">Protein</span>
                    <span className="font-bold text-success">
                      {nutrition
                        ? `${nutrition.proteinActual} / ${nutrition.proteinTarget}g${
                            nutrition.proteinActual >= nutrition.proteinTarget ? " ✓" : ""
                          }`
                        : "0 / 0g"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-elevated overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full"
                      style={{
                        width: `${
                          nutrition
                            ? Math.min(
                                100,
                                (nutrition.proteinActual / nutrition.proteinTarget) * 100 ||
                                  0,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link href="/nutrition" className="flex-1">
                <button className="w-full h-12 bg-elevated hover:bg-secondary border border-border rounded-xl text-secondary-foreground font-medium flex items-center justify-center gap-2 transition-colors">
                  <Plus size={18} />
                  Log Meal
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Weekly Progress Dots */}
        <section>
          <h2 className="text-xs font-bold text-tertiary uppercase tracking-wider mb-3">
            This Week
          </h2>
          <div className="bg-surface/50 rounded-xl p-4 border border-white/5 flex justify-between items-center">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  i < 2 ? "bg-primary" : i === 2 ? "bg-surface border-2 border-primary" : "bg-elevated"
                )} />
                <span className="text-[10px] text-tertiary font-medium">{day}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MobileShell>
  );
}
