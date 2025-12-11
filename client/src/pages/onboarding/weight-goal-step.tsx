import { useState } from "react";
import { OnboardingData } from "./index";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronLeft, TrendingUp, TrendingDown, Target } from "lucide-react";

interface WeightGoalStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const WEEKLY_RATE_OPTIONS = [
  { value: -1, label: "-1 kg/week", description: "Aggressive cut", type: "loss" },
  { value: -0.75, label: "-0.75 kg/week", description: "Moderate cut", type: "loss" },
  { value: -0.5, label: "-0.5 kg/week", description: "Steady cut", type: "loss" },
  { value: -0.25, label: "-0.25 kg/week", description: "Slow cut", type: "loss" },
  { value: 0, label: "Maintain", description: "No change", type: "maintain" },
  { value: 0.25, label: "+0.25 kg/week", description: "Lean bulk", type: "gain" },
  { value: 0.5, label: "+0.5 kg/week", description: "Steady bulk", type: "gain" },
  { value: 0.75, label: "+0.75 kg/week", description: "Moderate bulk", type: "gain" },
  { value: 1, label: "+1 kg/week", description: "Aggressive bulk", type: "gain" },
];

export function WeightGoalStep({ data, updateData, onNext, onBack }: WeightGoalStepProps) {
  const [targetWeightMin, setTargetWeightMin] = useState(data.targetWeightMin?.toString() || "");
  const [targetWeightMax, setTargetWeightMax] = useState(data.targetWeightMax?.toString() || "");
  const [weeklyRate, setWeeklyRate] = useState(data.weeklyWeightChangeTarget || 0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const currentWeight = data.currentWeight || 75;
  const selectedRate = WEEKLY_RATE_OPTIONS.find(opt => opt.value === weeklyRate);

  const handleNext = () => {
    const minWeight = parseFloat(targetWeightMin) || currentWeight;
    const maxWeight = parseFloat(targetWeightMax) || minWeight;

    updateData({
      targetWeightMin: Math.min(minWeight, maxWeight),
      targetWeightMax: Math.max(minWeight, maxWeight),
      weeklyWeightChangeTarget: weeklyRate,
    });
    onNext();
  };

  const estimatedWeeks = () => {
    const minWeight = parseFloat(targetWeightMin) || currentWeight;
    const change = Math.abs(minWeight - currentWeight);
    if (weeklyRate === 0 || change === 0) return null;
    return Math.round(change / Math.abs(weeklyRate));
  };

  const weeks = estimatedWeeks();

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen flex flex-col relative">
      <button
        onClick={onBack}
        className="absolute top-6 left-0 w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-border active:scale-95 transition-transform"
      >
        <ChevronLeft size={20} />
      </button>

      <header className="space-y-2 pt-8">
        <h1 className="text-2xl font-display font-bold">Weight Goal</h1>
        <p className="text-secondary text-sm">Set your target weight and pace</p>
      </header>

      <div className="space-y-8 flex-1 overflow-y-auto">
        {/* Current Weight Display */}
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Target size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-tertiary uppercase tracking-wider">Current Weight</p>
              <p className="text-2xl font-bold">{currentWeight} kg</p>
            </div>
          </div>
        </div>

        {/* Target Weight */}
        <div className="space-y-3">
          <Label className="text-xs font-bold text-tertiary uppercase tracking-wider">
            Target Weight (kg)
          </Label>

          {showAdvanced ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-secondary">Min</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder={currentWeight.toString()}
                  value={targetWeightMin}
                  onChange={(e) => setTargetWeightMin(e.target.value)}
                  className="text-lg font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-secondary">Max</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder={currentWeight.toString()}
                  value={targetWeightMax}
                  onChange={(e) => setTargetWeightMax(e.target.value)}
                  className="text-lg font-bold"
                />
              </div>
            </div>
          ) : (
            <Input
              type="number"
              step="0.1"
              placeholder={currentWeight.toString()}
              value={targetWeightMin}
              onChange={(e) => {
                setTargetWeightMin(e.target.value);
                setTargetWeightMax(e.target.value);
              }}
              className="text-lg font-bold text-center"
            />
          )}

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-primary hover:underline"
          >
            {showAdvanced ? "Use single target" : "Set a range (advanced)"}
          </button>
        </div>

        {/* Weekly Rate */}
        <div className="space-y-3">
          <Label className="text-xs font-bold text-tertiary uppercase tracking-wider">
            Weekly Rate
          </Label>

          <div className="grid grid-cols-1 gap-2">
            {WEEKLY_RATE_OPTIONS.map((option) => {
              const isSelected = weeklyRate === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => setWeeklyRate(option.value)}
                  className={`h-14 rounded-xl border-2 transition-all px-4 text-left flex items-center justify-between ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-elevated hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {option.type === "loss" && <TrendingDown size={18} className="text-blue-500" />}
                    {option.type === "gain" && <TrendingUp size={18} className="text-green-500" />}
                    {option.type === "maintain" && <Target size={18} className="text-secondary" />}
                    <div>
                      <div className="font-bold">{option.label}</div>
                      <div className="text-xs text-secondary">{option.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Estimated Timeline */}
        {weeks && weeks > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
            <p className="text-sm text-secondary mb-1">Estimated timeline</p>
            <p className="text-2xl font-bold text-primary">
              {weeks} week{weeks !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-secondary mt-1">
              {selectedRate?.label} • {(weeks / 4).toFixed(1)} months
            </p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6">
        <Button
          onClick={handleNext}
          className="w-full h-14 text-lg shadow-lg shadow-primary/20"
          size="lg"
          disabled={!targetWeightMin}
        >
          Continue to Schedule
        </Button>
      </div>
    </div>
  );
}
