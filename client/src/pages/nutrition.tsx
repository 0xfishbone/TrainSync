import { useState } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Camera, Mic, ChevronRight, Loader2, Check, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import healthyBreakfastImg from "@assets/stock_images/healthy_breakfast_eg_4358bed4.jpg";

export default function Nutrition() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");

  const handleScan = () => {
    setIsAnalyzing(true);
    // Simulate Gemini analysis delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResult(true);
    }, 2500);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    setIsAnalyzing(true);
    setShowTextInput(false);
    
    // Simulate text analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResult(true);
    }, 1500);
  };

  const handleConfirm = () => {
    toast.success("Meal logged successfully", {
      description: "Added 450 kcal, 25g protein",
    });
    setShowResult(false);
    setTextInput("");
  };

  return (
    <MobileShell>
      <div className="p-6 pt-12 min-h-screen flex flex-col">
        <header className="mb-8">
          <h1 className="text-2xl font-display font-bold mb-1">Log Meal</h1>
          <p className="text-secondary">Snap a photo, speak, or type.</p>
        </header>

        {!showResult ? (
          <div className="flex-1 flex flex-col justify-end pb-12 space-y-4">
            <div className="bg-surface border-2 border-dashed border-border rounded-3xl flex-1 flex flex-col items-center justify-center p-8 mb-4 relative overflow-hidden">
               {isAnalyzing && (
                 <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                   <Loader2 className="animate-spin text-primary mb-4" size={48} />
                   <p className="text-lg font-medium animate-pulse">Analyzing with Gemini...</p>
                 </div>
               )}
               
               {showTextInput ? (
                 <form onSubmit={handleTextSubmit} className="w-full h-full flex flex-col">
                   <textarea
                     autoFocus
                     value={textInput}
                     onChange={(e) => setTextInput(e.target.value)}
                     placeholder="e.g. 2 eggs, slice of toast, black coffee..."
                     className="flex-1 bg-transparent border-none resize-none text-lg text-white placeholder:text-secondary focus:ring-0 p-0"
                   />
                   <button 
                     type="submit"
                     className="mt-4 h-12 bg-primary rounded-xl text-white font-bold active:scale-95 transition-transform"
                   >
                     Analyze Text
                   </button>
                   <button 
                     type="button"
                     onClick={() => setShowTextInput(false)}
                     className="mt-2 h-12 text-secondary font-medium"
                   >
                     Cancel
                   </button>
                 </form>
               ) : (
                 <>
                   <Camera size={64} className="text-tertiary mb-4" />
                   <p className="text-center text-secondary">Tap to take a photo of your meal</p>
                 </>
               )}
            </div>

            {!showTextInput && (
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={handleScan}
                  disabled={isAnalyzing}
                  className="h-16 bg-primary hover:bg-blue-600 active:scale-95 transition-all rounded-2xl text-white font-bold flex flex-col items-center justify-center gap-1 shadow-lg shadow-primary/20"
                >
                  <Camera size={20} />
                  <span className="text-xs">Photo</span>
                </button>
                <button 
                  disabled={isAnalyzing}
                  className="h-16 bg-elevated hover:bg-secondary active:scale-95 transition-all rounded-2xl text-white font-bold flex flex-col items-center justify-center gap-1 border border-border"
                >
                  <Mic size={20} />
                  <span className="text-xs">Voice</span>
                </button>
                <button 
                  onClick={() => setShowTextInput(true)}
                  disabled={isAnalyzing}
                  className="h-16 bg-elevated hover:bg-secondary active:scale-95 transition-all rounded-2xl text-white font-bold flex flex-col items-center justify-center gap-1 border border-border"
                >
                  <Type size={20} />
                  <span className="text-xs">Text</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500">
             <div className="relative aspect-video rounded-2xl overflow-hidden mb-6 shadow-2xl">
                <img 
                  src={healthyBreakfastImg} 
                  className="w-full h-full object-cover"
                  alt="Scanned meal"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                   <span className="text-white font-bold text-lg">Detected Meal</span>
                </div>
             </div>

             <div className="bg-surface rounded-2xl p-6 border border-border space-y-6 mb-auto">
                <div className="flex items-start gap-4">
                   <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                     <Check className="text-success" size={24} />
                   </div>
                   <div>
                     <h3 className="text-xl font-bold mb-1">Eggs & Coffee</h3>
                     <p className="text-secondary text-sm">
                       Looks like 2 large eggs, 1 slice of toast, and black coffee.
                     </p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-elevated p-4 rounded-xl">
                      <p className="text-secondary text-xs uppercase font-bold mb-1">Calories</p>
                      <p className="text-2xl font-bold text-white">~450</p>
                   </div>
                   <div className="bg-elevated p-4 rounded-xl">
                      <p className="text-secondary text-xs uppercase font-bold mb-1">Protein</p>
                      <p className="text-2xl font-bold text-success">25g</p>
                   </div>
                </div>
             </div>

             <div className="space-y-3 mt-6 pb-12">
                <button 
                  onClick={handleConfirm}
                  className="w-full h-14 bg-primary hover:bg-blue-600 active:scale-95 transition-all rounded-xl text-white font-bold shadow-lg shadow-primary/20"
                >
                  Log Meal
                </button>
                <button 
                  onClick={() => setShowResult(false)}
                  className="w-full h-14 bg-transparent hover:bg-elevated active:scale-95 transition-all rounded-xl text-secondary font-medium"
                >
                  Edit Details
                </button>
             </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
