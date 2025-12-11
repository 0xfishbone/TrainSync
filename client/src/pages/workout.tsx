import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Play, Pause, SkipForward, Check, Clock, X, Share, Minus, Plus, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  requestWakeLock,
  releaseWakeLock,
  setupWakeLockAutoReacquire,
  vibrateTick,
  vibrateTimerEnd,
  vibrateSetComplete
} from "@/lib/webApis";
import { notifyWorkoutCompleted } from "@/lib/notifications";

import jumpRopeImg from "@assets/stock_images/person_doing_jump_ro_c71aaefd.jpg";
import bagWorkImg from "@assets/stock_images/person_punching_heav_5b73f17e.jpg";
import gobletSquatsImg from "@assets/stock_images/person_doing_goblet__77b2e30f.jpg";

// Default image map for common exercises
const EXERCISE_IMAGE_MAP: Record<string, string> = {
  "jump rope": jumpRopeImg,
  "jumping rope": jumpRopeImg,
  "rope work": jumpRopeImg,
  "bag work": bagWorkImg,
  "heavy bag": bagWorkImg,
  "punching bag": bagWorkImg,
  "goblet squat": gobletSquatsImg,
  "goblet squats": gobletSquatsImg,
  "squats": gobletSquatsImg,
};

interface Exercise {
  id: string;
  name: string;
  type: "timed" | "reps";
  rounds?: number;
  sets?: number;
  reps?: string;
  workTime?: number;
  restTime?: number;
  defaultWeight?: number;
  tips?: string;
  image?: string;
}

interface CompletedExercise {
  exerciseName: string;
  setsCompleted: number;
  avgWeight?: number;
  difficulty: "Easy" | "Good" | "Hard";
  extraRestTime: number;
}

export default function Workout() {
  const [_, setLocation] = useLocation();
  const [phase, setPhase] = useState<"preview" | "work" | "rest" | "rating" | "summary" | "loading">("loading");
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [difficulty, setDifficulty] = useState<"Easy" | "Good" | "Hard" | null>(null);
  const [extraRestTime, setExtraRestTime] = useState(0);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(false);

  // Backend integration state
  const [workoutData, setWorkoutData] = useState<Exercise[]>([]);
  const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [totalExtraRestTime, setTotalExtraRestTime] = useState(0);

  const currentExercise = workoutData[currentExerciseIndex];
  const totalExercises = workoutData.length;

  // Fetch today's workout & setup wake lock handling on mount
  useEffect(() => {
    fetchTodaysWorkout();
    setupWakeLockAutoReacquire();

    return () => {
      // Ensure wake lock is released when leaving workout
      releaseWakeLock();
    };
  }, []);

  const fetchTodaysWorkout = async () => {
    try {
      const userId = localStorage.getItem("trainsync_user_id");
      if (!userId) {
        toast.error("Please complete onboarding first");
        setLocation("/onboarding");
        return;
      }

      // Get current program
      const response = await fetch("/api/programs/current", {
        headers: { "x-user-id": userId },
      });

      if (response.status === 404) {
        toast.error("No active program found", {
          description: "Complete onboarding to generate your plan.",
        });
        setLocation("/onboarding");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load current program");
      }

      const program = await response.json();

      // Get today's day name
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const today = days[new Date().getDay()];

      // Get today's workout
      const todaysWorkout = program.workouts?.[today];

      if (!todaysWorkout || !todaysWorkout.exercises || todaysWorkout.exercises.length === 0) {
        toast.error("No workout scheduled for today", {
          description: "Check your program or take a rest day!",
        });
        setPhase("summary"); // Show empty summary
        return;
      }

      // Transform exercises to match our format
      const exercises: Exercise[] = todaysWorkout.exercises.map((ex: any, index: number) => {
        const exerciseName = ex.name.toLowerCase();
        const matchedImage = Object.keys(EXERCISE_IMAGE_MAP).find(key =>
          exerciseName.includes(key)
        );

        return {
          id: `${today}-${index}`,
          name: ex.name,
          type: ex.type || "reps",
          rounds: ex.rounds,
          sets: ex.sets,
          reps: ex.reps,
          workTime: ex.workTime,
          restTime: ex.restTime || 60,
          defaultWeight: ex.weight || 0,
          tips: ex.notes || "",
          image: matchedImage ? EXERCISE_IMAGE_MAP[matchedImage] : gobletSquatsImg,
        };
      });

      setWorkoutData(exercises);
      setPhase("preview");
    } catch (error: any) {
      console.error("Error fetching workout:", error);
      toast.error("Failed to load workout", {
        description: error.message || "Please try again",
      });
      setPhase("summary");
    }
  };

  // Initialize weight when exercise changes
  useEffect(() => {
    if (currentExercise) {
      setCurrentWeight(currentExercise.defaultWeight || 0);
    }
  }, [currentExercise]);

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive) {
      if (timeLeft > 0) {
        // Normal countdown
        interval = setInterval(() => {
          setTimeLeft((prev) => {
            const next = prev - 1;

            // Light tick haptic in last 3 seconds
            if (next > 0 && next <= 3) {
              vibrateTick();
            }

            // Strong haptic exactly at 0 will be handled in handleTimerComplete
            return next;
          });
        }, 1000);
      } else if (timeLeft === 0 && phase === "rest") {
        // Rest timer hit 0, start counting extra rest
        setExtraRestTime(prev => prev + 1); // Initial increment
        interval = setInterval(() => {
          setExtraRestTime((prev) => prev + 1);
        }, 1000);
      } else if (timeLeft === 0) {
        // Work timer hit 0
        handleTimerComplete();
      }
    }
    
    return () => clearInterval(interval);
  }, [isActive, timeLeft, phase]);

  const handleTimerComplete = () => {
    // Strong haptic when a timed phase finishes
    vibrateTimerEnd();

    if (phase === "work") {
      setIsActive(false);
      setPhase("rest");
      setTimeLeft(currentExercise.restTime || 0);
      setExtraRestTime(0);
      setIsActive(true);
    }
  };

  const handleNextRound = () => {
    const totalRounds = currentExercise.rounds || currentExercise.sets || 1;
    setIsActive(false);

    // Accumulate extra rest time for this exercise
    if (extraRestTime > 0) {
      setTotalExtraRestTime((prev) => prev + extraRestTime);
      setExtraRestTime(0);
    }

    if (currentRound < totalRounds) {
      setCurrentRound((prev) => prev + 1);
      setPhase("work");
      setTimeLeft(currentExercise.workTime || 0); // Reset timer if timed
    } else {
      // Exercise Complete -> Ask for Difficulty
      setPhase("rating");
    }
  };

  const submitRatingAndContinue = async (rating: "Easy" | "Good" | "Hard") => {
    setDifficulty(rating);

    // Haptic on exercise completion
    vibrateSetComplete();

    // Save completed exercise data
    const completedExercise: CompletedExercise = {
      exerciseName: currentExercise.name,
      setsCompleted: currentExercise.rounds || currentExercise.sets || 1,
      avgWeight: currentExercise.type === "reps" ? currentWeight : undefined,
      difficulty: rating,
      extraRestTime: totalExtraRestTime,
    };

    setCompletedExercises((prev) => [...prev, completedExercise]);
    setTotalExtraRestTime(0); // Reset for next exercise

    if (currentExerciseIndex < totalExercises - 1) {
      const nextIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
      setCurrentRound(1);
      setPhase("preview");
      setDifficulty(null);

      // Save progress to localStorage for home screen tracking
      const userId = localStorage.getItem("trainsync_user_id");
      if (userId) {
        const todayDate = new Date().toDateString();
        const progressKey = `workout_progress_${userId}_${todayDate}`;
        localStorage.setItem(progressKey, JSON.stringify({
          currentExerciseIndex: nextIndex,
          lastUpdated: new Date().toISOString(),
        }));
      }
    } else {
      // Workout complete - save session
      await saveWorkoutSession([...completedExercises, completedExercise], rating);
      setPhase("summary");

      // Clear progress from localStorage
      const userId = localStorage.getItem("trainsync_user_id");
      if (userId) {
        const todayDate = new Date().toDateString();
        const progressKey = `workout_progress_${userId}_${todayDate}`;
        localStorage.removeItem(progressKey);
      }
    }
  };

  const saveWorkoutSession = async (exercises: CompletedExercise[], lastRating: "Easy" | "Good" | "Hard") => {
    try {
      const userId = localStorage.getItem("trainsync_user_id");
      if (!userId) return;

      const endTime = new Date();
      const duration = sessionStartTime
        ? Math.round((endTime.getTime() - sessionStartTime.getTime()) / 1000 / 60)
        : 45; // Default 45 min

      // Calculate total volume (for weighted exercises)
      const totalVolume = exercises.reduce((sum, ex) => {
        if (ex.avgWeight) {
          return sum + (ex.avgWeight * ex.setsCompleted * 10); // Assume 10 reps avg
        }
        return sum;
      }, 0);

      // Create workout session
      const sessionResponse = await fetch("/api/workouts/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          date: sessionStartTime || new Date(),
          sessionName: workoutData[0]?.name || "Workout",
          completed: true,
          duration,
          totalVolume: Math.round(totalVolume),
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error("Failed to save workout session");
      }

      const session = await sessionResponse.json();
      setSessionId(session.id);

      // Save individual exercise completions
      for (const exercise of exercises) {
        await fetch("/api/workouts/exercises", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify({
            sessionId: session.id,
            exerciseName: exercise.exerciseName,
            setsCompleted: exercise.setsCompleted,
            avgWeight: exercise.avgWeight,
            difficulty: exercise.difficulty,
          }),
        });
      }

      toast.success("Workout saved!", {
        description: "Great work today 💪",
      });

      // Send workout completion notification
      notifyWorkoutCompleted(exercises.length, duration);
    } catch (error: any) {
      console.error("Error saving workout:", error);
      toast.error("Failed to save workout", {
        description: "Your progress wasn't saved",
      });
    }
  };

  const startWorkout = () => {
    // Set session start time on first exercise
    if (!sessionStartTime) {
      setSessionStartTime(new Date());
      // Try to keep the screen on during the session
      requestWakeLock();
    }
    setPhase("work");
    setTimeLeft(currentExercise.workTime || 0);
    setIsActive(currentExercise.type === "timed");
  };

  const handleShare = async () => {
    const hasWorkoutData = completedExercises.length > 0;
    if (!hasWorkoutData) return;

    const lines: string[] = [];
    lines.push("TrainSync Workout Summary");
    lines.push("");
    lines.push(`Duration: ${sessionStartTime ? `${Math.round(((new Date().getTime() - sessionStartTime.getTime()) / 1000) / 60)} min` : "n/a"}`);
    lines.push(`Exercises: ${completedExercises.length}`);
    const totalVolume = completedExercises.reduce((sum, ex) => {
      if (ex.avgWeight) {
        return sum + (ex.avgWeight * ex.setsCompleted * 10);
      }
      return sum;
    }, 0);
    if (totalVolume > 0) {
      lines.push(`Volume: ${totalVolume.toLocaleString()} kg (approx)`);
    }
    lines.push("");
    lines.push("Exercises:");
    completedExercises.forEach((ex) => {
      lines.push(
        `• ${ex.exerciseName} – ${ex.setsCompleted} sets` +
          (ex.avgWeight ? ` @ ~${ex.avgWeight}kg` : "") +
          ` (${ex.difficulty})` +
          (ex.extraRestTime ? `, +${formatTime(ex.extraRestTime)} extra rest` : "")
      );
    });

    const summary = lines.join("\n");

    try {
      // Prefer Web Share API when available
      if (navigator.share) {
        await navigator.share({
          title: "TrainSync Workout",
          text: summary,
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summary);
      }

      toast.success("Workout summary ready", {
        description: "Shared or copied. Paste into Apple Notes.",
      });
    } catch (err) {
      console.error("Share/copy failed:", err);
      toast.error("Unable to share workout", {
        description: "Try pasting manually if copied.",
      });
    }
  };

  const adjustWeight = (amount: number) => {
    setCurrentWeight(prev => Math.max(0, prev + amount));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // UI Components for different phases

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-secondary">Loading today's workout...</p>
      </div>
    );
  }

  // Safety check
  if (!currentExercise && phase !== "summary") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <p className="text-secondary mb-4">No workout data available</p>
        <Link href="/">
          <button className="px-6 py-3 bg-primary text-white rounded-xl">
            Back to Home
          </button>
        </Link>
      </div>
    );
  }

  if (phase === "preview") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="absolute inset-0 z-0">
           <img 
             src={currentExercise.image} 
             className="w-full h-[60vh] object-cover opacity-60 mask-image-gradient"
             alt={currentExercise.name}
           />
           <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col h-full p-6">
          <header className="flex justify-between items-center mb-auto">
            <Link href="/">
               <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                 <ChevronLeft className="text-white" />
               </button>
            </Link>
            <span className="text-xs font-bold uppercase tracking-widest opacity-70">
              Exercise {currentExerciseIndex + 1}/{totalExercises}
            </span>
          </header>

          <div className="mt-auto space-y-6 pb-10">
            <div>
              <h1 className="text-4xl font-display font-bold mb-2">{currentExercise.name}</h1>
              <div className="flex items-center gap-4 text-secondary mb-4">
                <span className="flex items-center gap-1">
                   <Clock size={16} /> 
                   {currentExercise.type === 'timed' 
                     ? `${currentExercise.rounds} x ${formatTime(currentExercise.workTime || 0)}` 
                     : `${currentExercise.sets} sets`
                   }
                </span>
                <span className="w-1 h-1 rounded-full bg-secondary" />
                <span>{currentExercise.tips}</span>
              </div>

              {/* Weight Adjustment in Preview */}
              {currentExercise.type === 'reps' && (
                <div className="bg-surface/50 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-secondary">Weight</span>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => adjustWeight(-2)}
                      className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-border active:scale-95"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="text-2xl font-bold w-16 text-center">{currentWeight}kg</span>
                    <button 
                      onClick={() => adjustWeight(2)}
                      className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-border active:scale-95"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={startWorkout}
              className="w-full h-16 bg-primary hover:bg-blue-600 active:scale-95 transition-all rounded-2xl text-white font-bold text-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Play fill="currentColor" size={20} />
              Start Exercise
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "work") {
    return (
      <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
        {/* Progress Bar */}
        <div className="h-2 bg-surface w-full absolute top-0 left-0 z-50">
          <motion.div 
            className="h-full bg-work"
            initial={{ width: "0%" }}
            animate={{ width: currentExercise.type === 'timed' ? "100%" : "100%" }}
            transition={{ duration: currentExercise.type === 'timed' ? currentExercise.workTime : 0, ease: "linear" }}
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
           <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
              <span className="text-secondary font-medium uppercase tracking-wider">
                {currentExercise.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWorkoutDetail(true)}
                  className="w-8 h-8 rounded-full bg-surface/50 backdrop-blur-sm flex items-center justify-center border border-border/50 active:scale-95 transition-transform"
                >
                  <List size={16} className="text-white" />
                </button>
                <span className="px-3 py-1 bg-surface rounded-full text-xs font-bold border border-border">
                  Round {currentRound}/{currentExercise.rounds || currentExercise.sets}
                </span>
              </div>
           </div>

           {currentExercise.type === 'timed' ? (
             <div className="text-[120px] font-mono font-bold text-work tabular-nums tracking-tighter leading-none">
               {formatTime(timeLeft)}
             </div>
           ) : (
             <div className="text-center space-y-2">
               <div className="text-[80px] font-bold text-white tabular-nums leading-none">
                 {currentExercise.reps}
               </div>
               <div className="text-2xl text-secondary font-medium">
                 {currentWeight > 0 ? `@ ${currentWeight}kg` : "Reps"}
               </div>
             </div>
           )}
        </div>

        <div className="p-6 pb-12 bg-surface rounded-t-3xl border-t border-white/10">
          <div className="grid grid-cols-2 gap-4">
            {isActive ? (
               <button 
                 onClick={() => setIsActive(false)}
                 className="h-20 bg-elevated rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform border border-border"
               >
                 <Pause size={24} className="text-white" />
                 <span className="text-xs font-medium text-secondary">Pause</span>
               </button>
            ) : (
               <button 
                 onClick={() => currentExercise.type === 'timed' ? setIsActive(true) : setPhase("rest")}
                 className={cn(
                   "h-20 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform",
                   currentExercise.type === 'timed' ? "bg-work text-black" : "bg-primary text-white"
                 )}
               >
                 {currentExercise.type === 'timed' ? <Play fill="currentColor" size={24} /> : <Check size={24} />}
                 <span className="text-xs font-bold">{currentExercise.type === 'timed' ? "Resume" : "Complete Set"}</span>
               </button>
            )}

            <button 
               onClick={handleNextRound}
               className="h-20 bg-elevated rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform border border-border"
            >
               <SkipForward size={24} className="text-white" />
               <span className="text-xs font-medium text-secondary">Skip</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "rest") {
    return (
      <div className="min-h-screen bg-rest/10 flex flex-col relative overflow-hidden">
        {/* Header with workout list button */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={() => setShowWorkoutDetail(true)}
            className="w-10 h-10 rounded-full bg-surface/80 backdrop-blur-sm flex items-center justify-center border border-border active:scale-95 transition-transform"
          >
            <List size={20} className="text-white" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
           <span className="text-rest font-bold uppercase tracking-widest mb-4 animate-pulse">
             {extraRestTime > 0 ? "Extra Rest" : "Resting"}
           </span>
           
           <div className={cn(
             "text-[100px] font-mono font-bold tabular-nums tracking-tighter leading-none mb-2",
             extraRestTime > 0 ? "text-destructive" : "text-rest"
           )}>
             {extraRestTime > 0 ? `+${formatTime(extraRestTime)}` : formatTime(timeLeft)}
           </div>

           {extraRestTime > 0 && (
             <p className="text-destructive font-bold mb-8 animate-pulse">
               Target rest exceeded
             </p>
           )}
           
           <div className="bg-black/20 backdrop-blur-sm p-4 rounded-2xl max-w-xs border border-rest/20 mt-4">
            <p className="text-sm text-rest/80 mb-1">Next Up</p>
            <p className="font-bold text-white text-lg">
              {currentRound < (currentExercise.rounds || currentExercise.sets || 0)
                ? `Round ${currentRound + 1}`
                : workoutData[currentExerciseIndex + 1]?.name || "Finish"}
            </p>
           </div>
        </div>

        <div className="p-6 pb-12">
          <button 
            onClick={handleNextRound}
            className={cn(
              "w-full h-16 active:scale-95 transition-all rounded-2xl font-bold text-xl shadow-xl",
              extraRestTime > 0 
                ? "bg-destructive text-white shadow-destructive/20 hover:bg-red-600" 
                : "bg-rest text-black shadow-rest/20 hover:bg-cyan-300"
            )}
          >
            {extraRestTime > 0 ? "Start Set (Recorded)" : "Skip Rest"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "rating") {
    return (
      <div className="min-h-screen bg-background flex flex-col p-6 items-center justify-center text-center space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold mb-2">{currentExercise.name} Complete</h1>
          <p className="text-secondary">How did that feel?</p>
        </div>

        <div className="w-full grid gap-4">
           <button 
             onClick={() => submitRatingAndContinue("Easy")}
             className="h-20 bg-elevated hover:bg-surface border border-border rounded-2xl flex items-center justify-between px-6 group transition-all active:scale-95"
           >
             <span className="font-bold text-lg group-hover:text-success transition-colors">Easy</span>
             <span className="text-2xl">😌</span>
           </button>
           <button 
             onClick={() => submitRatingAndContinue("Good")}
             className="h-20 bg-elevated hover:bg-surface border border-border rounded-2xl flex items-center justify-between px-6 group transition-all active:scale-95"
           >
             <span className="font-bold text-lg group-hover:text-primary transition-colors">Good</span>
             <span className="text-2xl">👍</span>
           </button>
           <button 
             onClick={() => submitRatingAndContinue("Hard")}
             className="h-20 bg-elevated hover:bg-surface border border-border rounded-2xl flex items-center justify-between px-6 group transition-all active:scale-95"
           >
             <span className="font-bold text-lg group-hover:text-destructive transition-colors">Hard</span>
             <span className="text-2xl">🥵</span>
           </button>
        </div>
      </div>
    );
  }

  if (phase === "summary") {
    // Calculate real workout stats
    const endTime = sessionStartTime ? new Date() : null;
    const duration = sessionStartTime && endTime
      ? Math.round((endTime.getTime() - sessionStartTime.getTime()) / 1000 / 60)
      : 0;

    const totalVolume = completedExercises.reduce((sum, ex) => {
      if (ex.avgWeight) {
        return sum + (ex.avgWeight * ex.setsCompleted * 10); // Assume 10 reps avg
      }
      return sum;
    }, 0);

    const totalExtraRest = completedExercises.reduce(
      (sum, ex) => sum + (ex.extraRestTime || 0),
      0
    );

    const hasWorkoutData = completedExercises.length > 0;

    return (
      <div className="min-h-screen bg-background flex flex-col p-6 items-center justify-center text-center space-y-8">
        <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mb-4">
          <Check size={48} className="text-success" />
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">
            {hasWorkoutData ? "Workout Complete!" : "No Workout Today"}
          </h1>
          <p className="text-secondary">
            {hasWorkoutData
              ? "Great job crushing it today."
              : "Check your program or take a rest day!"}
          </p>
        </div>

        {hasWorkoutData && (
          <div className="w-full bg-surface p-6 rounded-2xl border border-border space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <span className="text-secondary">Duration</span>
              <span className="font-bold text-xl">{duration} min</span>
            </div>
            {totalVolume > 0 && (
              <div className="flex justify-between items-center border-b border-border pb-4">
                <span className="text-secondary">Volume</span>
                <span className="font-bold text-xl">{totalVolume.toLocaleString()} kg</span>
              </div>
            )}
            <div className="flex justify-between items-center border-b border-border pb-4">
              <span className="text-secondary">Exercises</span>
              <span className="font-bold text-xl">{completedExercises.length}</span>
            </div>
            {totalExtraRest > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-secondary">Extra Rest</span>
                <span className="font-bold text-xl text-warning">+{formatTime(totalExtraRest)}</span>
              </div>
            )}
          </div>
        )}

        <div className="w-full space-y-3">
          {hasWorkoutData && (
            <button
              onClick={handleShare}
              className="w-full h-14 bg-primary hover:bg-blue-600 active:scale-95 transition-all rounded-xl text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Share size={20} />
              Export to Notes
            </button>
          )}

          <Link href="/">
            <button className="w-full h-14 bg-transparent hover:bg-elevated active:scale-95 transition-all rounded-xl text-secondary font-bold">
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Workout Detail Modal (accessible during workout)
  const WorkoutDetailModal = () => (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-surface w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border p-6 flex justify-between items-center z-10">
          <div>
            <h3 className="text-xl font-bold">Today's Workout</h3>
            <p className="text-sm text-secondary">
              {currentExerciseIndex + 1} of {totalExercises} • {completedExercises.length} completed
            </p>
          </div>
          <button
            onClick={() => setShowWorkoutDetail(false)}
            className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center hover:bg-surface border border-border active:scale-95 transition-transform"
          >
            <X size={20} className="text-secondary" />
          </button>
        </div>

        {/* Exercise List */}
        <div className="p-6 space-y-3">
          {workoutData.map((exercise, idx) => {
            const isCompleted = completedExercises.some(ce => ce.exerciseName === exercise.name);
            const isCurrent = idx === currentExerciseIndex;

            return (
              <div
                key={exercise.id}
                className={cn(
                  "rounded-xl p-4 border transition-all",
                  isCompleted
                    ? "bg-success/5 border-success/20"
                    : isCurrent
                      ? "bg-primary/10 border-primary/30"
                      : "bg-elevated border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Status Indicator */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    isCompleted
                      ? "bg-success/20 text-success"
                      : isCurrent
                        ? "bg-primary/20 text-primary"
                        : "bg-surface text-tertiary"
                  )}>
                    {isCompleted ? (
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
                        ? `${exercise.rounds} rounds × ${exercise.workTime}s work / ${exercise.restTime}s rest`
                        : `${exercise.sets} sets × ${exercise.reps} reps${exercise.defaultWeight ? ` @ ${exercise.defaultWeight}kg` : ""}`}
                    </p>
                    {exercise.tips && (
                      <p className="text-xs text-tertiary mt-1">{exercise.tips}</p>
                    )}
                  </div>

                  {/* Current Badge */}
                  {isCurrent && !isCompleted && (
                    <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold">
                      CURRENT
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface border-t border-border p-6">
          <button
            onClick={() => setShowWorkoutDetail(false)}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold active:scale-95 transition-all"
          >
            Back to Workout
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {showWorkoutDetail && <WorkoutDetailModal />}
      {null}
    </>
  );
}
