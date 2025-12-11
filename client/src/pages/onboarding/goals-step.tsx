import { useState } from "react";
import { OnboardingData } from "./index";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronLeft, X, Check } from "lucide-react";

interface GoalsStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const PRIMARY_GOALS = [
  { key: "strength", label: "Build Strength", desc: "Get stronger, lift heavier" },
  { key: "cardio", label: "Improve Cardio", desc: "Better endurance & stamina" },
  { key: "weight_gain", label: "Gain Weight", desc: "Build muscle mass" },
  { key: "weight_loss", label: "Lose Weight", desc: "Cut body fat" },
];

const SPORT_OPTIONS = [
  { key: "boxing", label: "Boxing/MMA" },
  { key: "running", label: "Running" },
  { key: "cycling", label: "Cycling" },
  { key: "general", label: "General Fitness" },
];

export function GoalsStep({ data, updateData, onNext, onBack }: GoalsStepProps) {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    data.primaryGoal || "strength",
    data.secondaryGoal || "",
  ].filter(Boolean));
  const [sportFocus, setSportFocus] = useState(data.sportFocus || "general");
  const [injuries, setInjuries] = useState<string[]>(data.injuries || []);
  const [injuryInput, setInjuryInput] = useState("");

  const toggleGoal = (goalKey: string) => {
    if (selectedGoals.includes(goalKey)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goalKey));
    } else if (selectedGoals.length < 2) {
      setSelectedGoals([...selectedGoals, goalKey]);
    }
  };

  const addInjury = () => {
    if (injuryInput.trim()) {
      setInjuries([...injuries, injuryInput.trim()]);
      setInjuryInput("");
    }
  };

  const removeInjury = (index: number) => {
    setInjuries(injuries.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    updateData({
      primaryGoal: selectedGoals[0] || "strength",
      secondaryGoal: selectedGoals[1] || undefined,
      sportFocus,
      injuries: injuries.length > 0 ? injuries : undefined,
    });
    onNext();
  };

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen flex flex-col relative">
      <button
        onClick={onBack}
        className="absolute top-6 left-0 w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-border active:scale-95 transition-transform"
      >
        <ChevronLeft size={20} />
      </button>

      <header className="space-y-2 pt-8">
        <h1 className="text-2xl font-display font-bold">Your Goals</h1>
        <p className="text-secondary text-sm">What do you want to achieve?</p>
      </header>

      <div className="space-y-8 flex-1 overflow-y-auto">
        <div className="space-y-3">
          <Label className="text-xs font-bold text-tertiary uppercase tracking-wider">
            Your goals (select up to 2)
          </Label>
          <div className="grid grid-cols-1 gap-3">
            {PRIMARY_GOALS.map((goal) => {
              const isSelected = selectedGoals.includes(goal.key);
              const isDisabled = !isSelected && selectedGoals.length >= 2;

              return (
                <button
                  key={goal.key}
                  onClick={() => toggleGoal(goal.key)}
                  disabled={isDisabled}
                  className={`h-16 rounded-xl border-2 transition-all px-4 text-left flex items-center justify-between ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : isDisabled
                      ? "border-border bg-elevated opacity-50 cursor-not-allowed"
                      : "border-border bg-elevated hover:border-primary/50"
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-bold">{goal.label}</div>
                    <div className="text-xs text-secondary">{goal.desc}</div>
                  </div>
                  {isSelected && (
                    <Check size={20} className="text-primary flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-bold text-tertiary uppercase tracking-wider">
            Sport focus (optional)
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {SPORT_OPTIONS.map((sport) => (
              <button
                key={sport.key}
                onClick={() => setSportFocus(sport.key)}
                className={`h-14 rounded-xl border-2 transition-all font-medium ${
                  sportFocus === sport.key
                    ? "border-primary bg-primary/10"
                    : "border-border bg-elevated hover:border-primary/50"
                }`}
              >
                {sport.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-bold text-tertiary uppercase tracking-wider">
            Injuries or limitations (optional)
          </Label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g., shoulder, knee"
              value={injuryInput}
              onChange={(e) => setInjuryInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addInjury()}
              className="flex-1"
            />
            <Button onClick={addInjury} variant="outline" size="default">
              Add
            </Button>
          </div>
          {injuries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {injuries.map((injury, index) => (
                <div
                  key={index}
                  className="px-3 py-1 bg-elevated rounded-full flex items-center gap-2 border border-border"
                >
                  <span className="text-sm">{injury}</span>
                  <button
                    onClick={() => removeInjury(index)}
                    className="hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <Button
          onClick={handleNext}
          className="w-full h-14 text-lg shadow-lg shadow-primary/20"
          size="lg"
        >
          Generate My Program
        </Button>
      </div>
    </div>
  );
}
