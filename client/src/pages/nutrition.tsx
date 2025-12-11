import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Camera, Mic, Loader2, Check, Type } from "lucide-react";
import { toast } from "sonner";

interface MealAnalysis {
  description: string;
  calories: number;
  protein: number;
  foods: string[];
  photoUrl?: string;
}

export default function Nutrition() {
  const [, setLocation] = useLocation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [mealAnalysis, setMealAnalysis] = useState<MealAnalysis | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check user is logged in
    const userId = localStorage.getItem("trainsync_user_id");
    if (!userId) {
      toast.error("Please complete onboarding first");
      setLocation("/onboarding");
      return;
    }

    setIsAnalyzing(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(",")[1];
        const mimeType = file.type;

        // Store image URL for display
        setCapturedImageUrl(base64);

        // Call Gemini API for analysis (photo)
        const response = await fetch("/api/meals/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to analyze meal photo");
        }

        const analysis = await response.json();
        setMealAnalysis({
          description: `Detected: ${(analysis.foods || []).join(", ")}`,
          calories: analysis.calories,
          protein: analysis.protein,
          foods: analysis.foods || [],
          photoUrl: base64,
        });

        setIsAnalyzing(false);
        setShowResult(true);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Error analyzing photo:", error);
      toast.error("Failed to analyze meal", {
        description: error.message || "Please try again",
      });
      setIsAnalyzing(false);
    }
  };

  const handleScan = () => {
    fileInputRef.current?.click();
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const userId = localStorage.getItem("trainsync_user_id");
    if (!userId) {
      toast.error("Please complete onboarding first");
      setLocation("/onboarding");
      return;
    }

    setIsAnalyzing(true);
    setShowTextInput(false);

    try {
      // Call Gemini API for text/voice analysis
      const response = await fetch("/api/meals/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          mealText: textInput,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze meal description");
      }

      const analysis = await response.json();
      setMealAnalysis({
        description: textInput,
        calories: analysis.calories,
        protein: analysis.protein,
        foods: analysis.foods || [],
      });

      setIsAnalyzing(false);
      setShowResult(true);
    } catch (error: any) {
      console.error("Error analyzing text:", error);
      toast.error("Failed to analyze meal", {
        description: error.message || "Please try again",
      });
      setIsAnalyzing(false);
      setShowTextInput(true);
    }
  };

  const handleConfirm = async () => {
    if (!mealAnalysis) return;

    const userId = localStorage.getItem("trainsync_user_id");
    if (!userId) return;

    try {
      // Save meal log to backend
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          mealDate: new Date().toISOString(),
          mealType: "other",
          loggingMethod: mealAnalysis.photoUrl ? "photo" : "text",
          photoStored: false,
          photoKey: null,
          foodsIdentified: mealAnalysis.foods,
          calories: Math.round(mealAnalysis.calories),
          protein: Math.round(mealAnalysis.protein),
          aiAnalysis: null,
          aiModelUsed: "gemini-2.0-flash-exp",
          confidenceScore: 0.8,
          manuallyAdjusted: false,
          finalCalories: Math.round(mealAnalysis.calories),
          finalProtein: Math.round(mealAnalysis.protein),
          notes: mealAnalysis.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save meal log");
      }

      toast.success("Meal logged successfully", {
        description: `Added ${Math.round(mealAnalysis.calories)} kcal, ${Math.round(mealAnalysis.protein)}g protein`,
      });

      // Reset state
      setShowResult(false);
      setTextInput("");
      setMealAnalysis(null);
      setCapturedImageUrl(null);
    } catch (error: any) {
      console.error("Error saving meal:", error);
      toast.error("Failed to save meal", {
        description: error.message || "Please try again",
      });
    }
  };

  return (
    <MobileShell>
      <div className="p-6 pt-12 min-h-screen flex flex-col">
        {/* Hidden file input for camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
        />

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
                   <p className="text-sm text-secondary mt-2">This may take a few seconds...</p>
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
             {capturedImageUrl && (
               <div className="relative aspect-video rounded-2xl overflow-hidden mb-6 shadow-2xl">
                  <img
                    src={capturedImageUrl}
                    className="w-full h-full object-cover"
                    alt="Captured meal"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                     <span className="text-white font-bold text-lg">Detected Meal</span>
                  </div>
               </div>
             )}

             <div className="bg-surface rounded-2xl p-6 border border-border space-y-6 mb-auto">
                <div className="flex items-start gap-4">
                   <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                     <Check className="text-success" size={24} />
                   </div>
                   <div>
                     <h3 className="text-xl font-bold mb-1">
                       {mealAnalysis?.foods?.[0] || "Meal Detected"}
                     </h3>
                     <p className="text-secondary text-sm">
                       {mealAnalysis?.description || "Meal analyzed by Gemini AI"}
                     </p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-elevated p-4 rounded-xl">
                      <p className="text-secondary text-xs uppercase font-bold mb-1">Calories</p>
                      <p className="text-2xl font-bold text-white">
                        ~{Math.round(mealAnalysis?.calories || 0)}
                      </p>
                   </div>
                   <div className="bg-elevated p-4 rounded-xl">
                      <p className="text-secondary text-xs uppercase font-bold mb-1">Protein</p>
                      <p className="text-2xl font-bold text-success">
                        {Math.round(mealAnalysis?.protein || 0)}g
                      </p>
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
                  onClick={() => {
                    setShowResult(false);
                    setMealAnalysis(null);
                    setCapturedImageUrl(null);
                  }}
                  className="w-full h-14 bg-transparent hover:bg-elevated active:scale-95 transition-all rounded-xl text-secondary font-medium"
                >
                  Retake / Edit
                </button>
             </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
