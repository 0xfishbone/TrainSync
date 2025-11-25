import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Play, Pause, SkipForward, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

import jumpRopeImg from "@assets/stock_images/person_doing_jump_ro_c71aaefd.jpg";
import bagWorkImg from "@assets/stock_images/person_punching_heav_5b73f17e.jpg";
import gobletSquatsImg from "@assets/stock_images/person_doing_goblet__77b2e30f.jpg";

// Mock Workout Data
const WORKOUT_DATA = [
  {
    id: 1,
    name: "Jump Rope",
    type: "timed",
    rounds: 3, // Reduced for demo
    workTime: 10, // Shortened for demo
    restTime: 5,  // Shortened for demo
    image: jumpRopeImg,
    tips: "Stay on your toes, keep elbows in.",
    reps: 0,
    sets: 0,
  },
  {
    id: 2,
    name: "Bag Work",
    type: "timed",
    rounds: 3,
    workTime: 15,
    restTime: 10,
    image: bagWorkImg,
    tips: "Focus on snapping your punches.",
    reps: 0,
    sets: 0,
  },
  {
    id: 3,
    name: "Goblet Squats",
    type: "reps",
    sets: 3,
    reps: "12-15",
    weight: "24kg",
    restTime: 15,
    image: gobletSquatsImg,
    tips: "Keep chest up, knees out.",
    workTime: 0,
    rounds: 0,
  }
];

export default function Workout() {
  const [_, setLocation] = useLocation();
  const [phase, setPhase] = useState<"preview" | "work" | "rest" | "summary">("preview");
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  const currentExercise = WORKOUT_DATA[currentExerciseIndex];
  const totalExercises = WORKOUT_DATA.length;

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    setIsActive(false);
    // Haptic feedback would go here
    if (phase === "work") {
      setPhase("rest");
      setTimeLeft(currentExercise.restTime || 0);
      setIsActive(true);
    } else if (phase === "rest") {
      handleNextRound();
    }
  };

  const handleNextRound = () => {
    const totalRounds = currentExercise.rounds || currentExercise.sets || 1;
    
    if (currentRound < totalRounds) {
      setCurrentRound((prev) => prev + 1);
      setPhase("work");
      setTimeLeft(currentExercise.workTime || 0); // Reset timer if timed
    } else {
      // Exercise Complete
      if (currentExerciseIndex < totalExercises - 1) {
        setCurrentExerciseIndex((prev) => prev + 1);
        setCurrentRound(1);
        setPhase("preview"); // Show preview for next exercise
      } else {
        setPhase("summary");
      }
    }
  };

  const startWorkout = () => {
    setPhase("work");
    setTimeLeft(currentExercise.workTime || 0);
    setIsActive(currentExercise.type === "timed");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // UI Components for different phases
  
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
              <div className="flex items-center gap-4 text-secondary">
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
              <span className="px-3 py-1 bg-surface rounded-full text-xs font-bold border border-border">
                Round {currentRound}/{currentExercise.rounds || currentExercise.sets}
              </span>
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
               <div className="text-2xl text-secondary font-medium">Reps</div>
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
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
           <span className="text-rest font-bold uppercase tracking-widest mb-4 animate-pulse">Resting</span>
           <div className="text-[100px] font-mono font-bold text-rest tabular-nums tracking-tighter leading-none mb-8">
             {formatTime(timeLeft)}
           </div>
           
           <div className="bg-black/20 backdrop-blur-sm p-4 rounded-2xl max-w-xs border border-rest/20">
             <p className="text-sm text-rest/80 mb-1">Next Up</p>
             <p className="font-bold text-white text-lg">
               {currentRound < (currentExercise.rounds || currentExercise.sets || 0) 
                 ? `Round ${currentRound + 1}` 
                 : WORKOUT_DATA[currentExerciseIndex + 1]?.name || "Finish"}
             </p>
           </div>
        </div>

        <div className="p-6 pb-12">
          <button 
            onClick={handleNextRound}
            className="w-full h-16 bg-rest hover:bg-cyan-300 active:scale-95 transition-all rounded-2xl text-black font-bold text-xl shadow-xl shadow-rest/20"
          >
            Skip Rest
          </button>
        </div>
      </div>
    );
  }

  if (phase === "summary") {
    return (
      <div className="min-h-screen bg-background flex flex-col p-6 items-center justify-center text-center space-y-8">
        <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mb-4">
          <Check size={48} className="text-success" />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold mb-2">Workout Complete!</h1>
          <p className="text-secondary">Great job crushing the bag work today.</p>
        </div>

        <div className="w-full bg-surface p-6 rounded-2xl border border-border space-y-4">
           <div className="flex justify-between items-center border-b border-border pb-4">
             <span className="text-secondary">Duration</span>
             <span className="font-bold text-xl">48:00</span>
           </div>
           <div className="flex justify-between items-center border-b border-border pb-4">
             <span className="text-secondary">Volume</span>
             <span className="font-bold text-xl">12,450 kg</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-secondary">Avg Rest</span>
             <span className="font-bold text-xl text-warning">+45s</span>
           </div>
        </div>

        <Link href="/">
          <button className="w-full h-14 bg-secondary hover:bg-elevated active:scale-95 transition-all rounded-xl text-white font-bold border border-border">
            Back to Home
          </button>
        </Link>
      </div>
    );
  }

  return null;
}
