import { useState, useEffect } from "react";
import { OnboardingData } from "./index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
}

export function ProfileStep({ data, updateData, onNext }: ProfileStepProps) {
  const [name, setName] = useState(data.name);
  const [age, setAge] = useState(data.age || "");
  const [currentWeight, setCurrentWeight] = useState(data.currentWeight || "");
  const [targetWeight, setTargetWeight] = useState(data.targetWeightMax || "");
  const [goalType, setGoalType] = useState<"gain" | "lose" | "maintain">("gain");

  const canContinue = name && age && currentWeight && targetWeight;

  const handleNext = () => {
    const ageNum = Number(age);
    const currentWeightNum = Number(currentWeight);
    const targetWeightNum = Number(targetWeight);

    // Calculate nutrition targets based on goals
    const weightDiff = targetWeightNum - currentWeightNum;
    const weeklyWeightChange = goalType === "gain" ? 0.5 : goalType === "lose" ? -0.5 : 0;

    // Simple calorie calculation (this would be more sophisticated in production)
    const bmr = goalType === "gain"
      ? currentWeightNum * 35 + 500 // Surplus for muscle gain
      : goalType === "lose"
      ? currentWeightNum * 30 - 500 // Deficit for fat loss
      : currentWeightNum * 32; // Maintenance

    const proteinTarget = Math.round(currentWeightNum * 2); // 2g per kg bodyweight

    updateData({
      name,
      age: ageNum,
      currentWeight: currentWeightNum,
      targetWeightMax: targetWeightNum,
      targetWeightMin: targetWeightNum,
      dailyCaloriesTarget: Math.round(bmr),
      dailyProteinTarget: proteinTarget,
      weeklyWeightChangeTarget: weeklyWeightChange,
    });

    onNext();
  };

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen flex flex-col">
      <header className="space-y-2">
        <h1 className="text-2xl font-display font-bold">About You</h1>
        <p className="text-secondary text-sm">Let's start with some basic information</p>
      </header>

      <div className="space-y-6 flex-1">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs font-bold text-tertiary uppercase tracking-wider">
            What's your name?
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-14 text-lg"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="age" className="text-xs font-bold text-tertiary uppercase tracking-wider">
              Age
            </Label>
            <Input
              id="age"
              type="number"
              placeholder="25"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="h-14 text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentWeight" className="text-xs font-bold text-tertiary uppercase tracking-wider">
              Current Weight (kg)
            </Label>
            <Input
              id="currentWeight"
              type="number"
              step="0.1"
              placeholder="75.0"
              value={currentWeight}
              onChange={(e) => setCurrentWeight(e.target.value)}
              className="h-14 text-lg"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-bold text-tertiary uppercase tracking-wider">
            What's your goal?
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setGoalType("gain")}
              className={`h-20 rounded-xl border-2 transition-all ${
                goalType === "gain"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-elevated hover:border-primary/50"
              }`}
            >
              <div className="font-bold">Gain</div>
              <div className="text-xs text-secondary">Build muscle</div>
            </button>
            <button
              onClick={() => setGoalType("lose")}
              className={`h-20 rounded-xl border-2 transition-all ${
                goalType === "lose"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-elevated hover:border-primary/50"
              }`}
            >
              <div className="font-bold">Lose</div>
              <div className="text-xs text-secondary">Cut fat</div>
            </button>
            <button
              onClick={() => setGoalType("maintain")}
              className={`h-20 rounded-xl border-2 transition-all ${
                goalType === "maintain"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-elevated hover:border-primary/50"
              }`}
            >
              <div className="font-bold">Maintain</div>
              <div className="text-xs text-secondary">Stay fit</div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetWeight" className="text-xs font-bold text-tertiary uppercase tracking-wider">
            Target Weight (kg)
          </Label>
          <Input
            id="targetWeight"
            type="number"
            step="0.1"
            placeholder="80.0"
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            className="h-14 text-lg"
          />
        </div>
      </div>

      <div className="mt-auto pt-6">
        <Button
          onClick={handleNext}
          disabled={!canContinue}
          className="w-full h-14 text-lg shadow-lg shadow-primary/20"
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
