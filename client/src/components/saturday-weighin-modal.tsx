import { useState } from "react";
import { X, Scale, TrendingUp, TrendingDown } from "lucide-react";

interface SaturdayWeighInModalProps {
  onWeighInComplete: (weight: number, notes?: string) => void;
  lastWeight: number | null;
  targetWeightChange: number; // kg per week (positive for gain, negative for loss)
}

export function SaturdayWeighInModal({
  onWeighInComplete,
  lastWeight,
  targetWeightChange,
}: SaturdayWeighInModalProps) {
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const weightNum = parseFloat(weight);

    if (isNaN(weightNum) || weightNum <= 0) {
      setError("Please enter a valid weight");
      return;
    }

    if (weightNum < 30 || weightNum > 300) {
      setError("Weight seems unusual. Please double-check.");
      return;
    }

    onWeighInComplete(weightNum, notes.trim() || undefined);
  };

  const weightChange = lastWeight && weight ? parseFloat(weight) - lastWeight : null;
  const changeDirection = weightChange && weightChange > 0 ? "gain" : "loss";
  const targetDirection = targetWeightChange > 0 ? "gain" : "loss";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl max-w-md w-full p-8 border border-border/30 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scale size={40} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Saturday Weigh-In</h2>
          <p className="text-secondary text-sm">
            Record your weekly weight to track progress
          </p>
        </div>

        {/* Last Weight Reference */}
        {lastWeight && (
          <div className="bg-elevated rounded-xl p-4 mb-6 border border-border/20">
            <div className="text-xs text-secondary mb-1">Last Week</div>
            <div className="text-2xl font-bold">{lastWeight.toFixed(1)} kg</div>
          </div>
        )}

        {/* Weight Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Current Weight (kg) *
          </label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value);
              setError("");
            }}
            placeholder="75.5"
            className="w-full px-4 py-3 rounded-xl bg-elevated border border-border/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg font-semibold"
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Weight Change Preview */}
        {weightChange !== null && (
          <div className={`rounded-xl p-4 mb-6 border ${
            changeDirection === targetDirection
              ? "bg-green-500/10 border-green-500/30"
              : "bg-amber-500/10 border-amber-500/30"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {weightChange > 0 ? (
                <TrendingUp size={20} className={changeDirection === targetDirection ? "text-green-500" : "text-amber-500"} />
              ) : (
                <TrendingDown size={20} className={changeDirection === targetDirection ? "text-green-500" : "text-amber-500"} />
              )}
              <span className="text-sm font-medium">
                {Math.abs(weightChange).toFixed(1)} kg {changeDirection} this week
              </span>
            </div>
            <p className="text-xs text-secondary">
              Target: {Math.abs(targetWeightChange).toFixed(1)} kg {targetDirection} per week
            </p>
          </div>
        )}

        {/* Optional Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any observations? Feeling bloated, had a big meal, etc."
            className="w-full px-4 py-3 rounded-xl bg-elevated border border-border/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSubmit}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors active:scale-95"
          >
            Save Weight
          </button>
          <p className="text-xs text-center text-secondary">
            You can't skip this step. Consistent tracking = better results!
          </p>
        </div>
      </div>
    </div>
  );
}
