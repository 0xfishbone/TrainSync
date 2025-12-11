import { useState } from "react";
import { TrendingDown, TrendingUp, Target, AlertCircle } from "lucide-react";

interface GoalAdjustmentModalProps {
  currentGoal: {
    targetWeightMin: number;
    targetWeightMax: number;
    weeklyRate: number;
  };
  suggestedGoal: {
    targetWeightMin: number;
    targetWeightMax: number;
    weeklyRate: number;
  };
  reason: string;
  weeksOffTrack: number;
  onAccept: (notes?: string) => void;
  onDecline: () => void;
  onModify: (newGoal: { targetWeightMin: number; targetWeightMax: number; weeklyRate: number }) => void;
}

export function GoalAdjustmentModal({
  currentGoal,
  suggestedGoal,
  reason,
  weeksOffTrack,
  onAccept,
  onDecline,
  onModify,
}: GoalAdjustmentModalProps) {
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"review" | "modify">("review");
  const [customGoal, setCustomGoal] = useState(suggestedGoal);

  const isGaining = currentGoal.weeklyRate > 0;

  const handleAccept = () => {
    onAccept(notes.trim() || undefined);
  };

  const handleModify = () => {
    if (mode === "review") {
      setMode("modify");
    } else {
      onModify(customGoal);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-8 border border-border/30 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target size={32} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Goal Adjustment Suggested</h2>
          <p className="text-secondary text-sm">
            You've been off-track for {weeksOffTrack} weeks
          </p>
        </div>

        {/* Reason */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{reason}</p>
          </div>
        </div>

        {mode === "review" ? (
          <>
            {/* Current vs Suggested Comparison */}
            <div className="space-y-4 mb-6">
              {/* Current Goal */}
              <div className="bg-elevated rounded-xl p-4 border border-border/20">
                <div className="text-xs text-secondary mb-2">Current Goal</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold">
                      {currentGoal.targetWeightMin === currentGoal.targetWeightMax
                        ? `${currentGoal.targetWeightMin.toFixed(1)} kg`
                        : `${currentGoal.targetWeightMin.toFixed(1)}-${currentGoal.targetWeightMax.toFixed(1)} kg`}
                    </div>
                    <div className="text-sm text-secondary mt-1">
                      {Math.abs(currentGoal.weeklyRate).toFixed(1)} kg/week{" "}
                      {isGaining ? "gain" : "loss"}
                    </div>
                  </div>
                  {isGaining ? (
                    <TrendingUp size={24} className="text-green-500" />
                  ) : (
                    <TrendingDown size={24} className="text-blue-500" />
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="text-center text-2xl text-secondary">↓</div>

              {/* Suggested Goal */}
              <div className="bg-primary/10 rounded-xl p-4 border border-primary/30">
                <div className="text-xs text-primary mb-2">Suggested Goal</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold">
                      {suggestedGoal.targetWeightMin === suggestedGoal.targetWeightMax
                        ? `${suggestedGoal.targetWeightMin.toFixed(1)} kg`
                        : `${suggestedGoal.targetWeightMin.toFixed(1)}-${suggestedGoal.targetWeightMax.toFixed(1)} kg`}
                    </div>
                    <div className="text-sm text-secondary mt-1">
                      {Math.abs(suggestedGoal.weeklyRate).toFixed(1)} kg/week{" "}
                      {isGaining ? "gain" : "loss"}
                    </div>
                  </div>
                  {isGaining ? (
                    <TrendingUp size={24} className="text-primary" />
                  ) : (
                    <TrendingDown size={24} className="text-primary" />
                  )}
                </div>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Any thoughts? (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why do you think this happened? What will you do differently?"
                className="w-full px-4 py-3 rounded-xl bg-elevated border border-border/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAccept}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors active:scale-95"
              >
                Accept Suggested Goal
              </button>
              <button
                onClick={handleModify}
                className="w-full bg-elevated border border-border/30 text-foreground py-3 rounded-xl font-medium hover:bg-surface transition-colors"
              >
                Modify Goal Myself
              </button>
              <button
                onClick={onDecline}
                className="w-full bg-transparent text-secondary py-3 rounded-xl font-medium hover:bg-elevated transition-colors"
              >
                Keep Current Goal
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Custom Goal Editor */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Target Weight Range (kg)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.1"
                    value={customGoal.targetWeightMin}
                    onChange={(e) =>
                      setCustomGoal({
                        ...customGoal,
                        targetWeightMin: parseFloat(e.target.value),
                      })
                    }
                    className="px-4 py-3 rounded-xl bg-elevated border border-border/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={customGoal.targetWeightMax}
                    onChange={(e) =>
                      setCustomGoal({
                        ...customGoal,
                        targetWeightMax: parseFloat(e.target.value),
                      })
                    }
                    className="px-4 py-3 rounded-xl bg-elevated border border-border/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Weekly Rate (kg/week)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={customGoal.weeklyRate}
                  onChange={(e) =>
                    setCustomGoal({
                      ...customGoal,
                      weeklyRate: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-elevated border border-border/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.5"
                />
                <p className="text-xs text-secondary mt-2">
                  Positive for weight gain, negative for weight loss
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleModify}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors active:scale-95"
              >
                Save Custom Goal
              </button>
              <button
                onClick={() => setMode("review")}
                className="w-full bg-transparent border border-border/30 text-secondary py-3 rounded-xl font-medium hover:bg-elevated transition-colors"
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
