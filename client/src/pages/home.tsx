import { MobileShell } from "@/components/layout/mobile-shell";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Link } from "wouter";
import { ChevronRight, Plus, User, X, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const today = new Date();
  const [showWeighIn, setShowWeighIn] = useState(false);
  const [weight, setWeight] = useState("85.2");

  const handleWeightSave = () => {
    setShowWeighIn(false);
    toast.success("Weight Updated", {
      description: `New weight: ${weight}kg`,
    });
  };

  return (
    <MobileShell>
      <div className="p-6 space-y-8 pt-12 relative">
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
              <span className="text-2xl font-display font-bold">{weight} kg</span>
              <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                ↗ +0.3kg
              </span>
            </div>
          </div>
          <Link href="/profile">
            <button className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-border active:scale-95 transition-transform">
              <User size={20} className="text-secondary" />
            </button>
          </Link>
        </header>

        {/* Today's Training Card */}
        <section>
          <h2 className="text-xs font-bold text-tertiary uppercase tracking-wider mb-3">
            Today's Training
          </h2>
          <div className="bg-surface rounded-2xl p-5 shadow-lg border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Bag Work + Conditioning</h3>
                  <p className="text-secondary text-sm">~50 minutes • High Intensity</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <ChevronRight size={24} />
                </div>
              </div>

              <div className="flex gap-2 mb-6">
                <div className="h-1.5 flex-1 rounded-full bg-elevated overflow-hidden">
                   <div className="h-full w-0 bg-primary" />
                </div>
                <div className="h-1.5 flex-1 rounded-full bg-elevated" />
                <div className="h-1.5 flex-1 rounded-full bg-elevated" />
                <div className="h-1.5 flex-1 rounded-full bg-elevated" />
              </div>

              <Link href="/workout">
                <button className="w-full h-14 bg-primary hover:bg-blue-600 active:scale-95 transition-all rounded-xl text-white font-bold text-lg shadow-lg shadow-primary/20">
                  Start Workout
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Nutrition Today Card */}
        <section>
          <h2 className="text-xs font-bold text-tertiary uppercase tracking-wider mb-3">
            Nutrition Today
          </h2>
          <div className="bg-surface rounded-2xl p-5 shadow-lg border border-white/5">
            <div className="flex items-center gap-6">
              <CircularProgress 
                value={79} 
                size={100} 
                strokeWidth={8} 
                trackColor="text-elevated"
                color="text-warning"
              >
                <div className="text-center">
                  <span className="text-xs text-tertiary block">Left</span>
                  <span className="text-xl font-bold text-white">650</span>
                </div>
              </CircularProgress>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-secondary">Calories</span>
                    <span className="font-bold">2,450 / 3,100</span>
                  </div>
                  <div className="h-2 rounded-full bg-elevated overflow-hidden">
                    <div className="h-full w-[79%] bg-warning rounded-full" />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-secondary">Protein</span>
                    <span className="font-bold text-success">155 / 155g ✓</span>
                  </div>
                  <div className="h-2 rounded-full bg-elevated overflow-hidden">
                    <div className="h-full w-full bg-success rounded-full" />
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
