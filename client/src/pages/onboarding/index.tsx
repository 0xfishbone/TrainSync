import { useState } from "react";
import { useLocation } from "wouter";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ProfileStep } from "./profile-step";
import { ScheduleStep } from "./schedule-step";
import { EquipmentStep } from "./equipment-step";
import { GoalsStep } from "./goals-step";
import { WeightGoalStep } from "./weight-goal-step";
import { GeneratingStep } from "./generating-step";
import { ProgramPreview } from "./program-preview";

export interface OnboardingData {
  // Profile
  name: string;
  age: number;
  currentWeight: number;
  targetWeightMin?: number;
  targetWeightMax?: number;

  // Schedule
  trainingDaysPerWeek: number;
  availableDays: string[];
  sessionDuration: number;
  preferredTrainingTime?: string;

  // Equipment
  trainingLocation: string;
  equipmentAvailable: string[];

  // Goals
  primaryGoal: string;
  secondaryGoal?: string;
  sportFocus?: string;
  injuries?: string[];
  exercisesToAvoid?: string[];

  // Nutrition (auto-calculated)
  dailyCaloriesTarget: number;
  dailyProteinTarget: number;
  weeklyWeightChangeTarget: number;
}

const INITIAL_DATA: OnboardingData = {
  name: "",
  age: 0,
  currentWeight: 0,
  trainingDaysPerWeek: 5,
  availableDays: [],
  sessionDuration: 60,
  trainingLocation: "gym",
  equipmentAvailable: [],
  primaryGoal: "strength",
  dailyCaloriesTarget: 0,
  dailyProteinTarget: 0,
  weeklyWeightChangeTarget: 0,
};

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [generatedProgram, setGeneratedProgram] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (step === 5) {
      // Start program generation
      generateProgram();
    } else if (step < 7) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const generateProgram = async () => {
    setStep(6); // Move to generating step
    setIsGenerating(true);

    try {
      // First, register user (if not already registered)
      // For MVP, we'll skip auth and use a test user ID
      const testUserId = "test-user-" + Date.now();

      // Create user profile
      const profileResponse = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
        body: JSON.stringify({
          name: data.name,
          age: data.age,
          currentWeight: data.currentWeight,
          targetWeightMin: data.targetWeightMin,
          targetWeightMax: data.targetWeightMax,
          primaryGoal: data.primaryGoal,
          secondaryGoal: data.secondaryGoal,
          sportFocus: data.sportFocus,
          trainingDaysPerWeek: data.trainingDaysPerWeek,
          availableDays: data.availableDays,
          sessionDuration: data.sessionDuration,
          preferredTrainingTime: data.preferredTrainingTime,
          trainingLocation: data.trainingLocation,
          equipmentAvailable: data.equipmentAvailable,
          injuries: data.injuries,
          exercisesToAvoid: data.exercisesToAvoid,
          dailyCaloriesTarget: data.dailyCaloriesTarget,
          dailyProteinTarget: data.dailyProteinTarget,
          weeklyWeightChangeTarget: data.weeklyWeightChangeTarget,
          onboardingCompleted: true,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to create profile");
      }

      // Generate program
      const programResponse = await fetch("/api/programs/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
      });

      if (!programResponse.ok) {
        const error = await programResponse.json();
        throw new Error(error.error || "Failed to generate program");
      }

      const program = await programResponse.json();
      setGeneratedProgram(program);

      // Store user ID for later use
      localStorage.setItem("trainsync_user_id", testUserId);

      setIsGenerating(false);
      setStep(7); // Move to preview step
    } catch (error: any) {
      console.error("Program generation error:", error);
      alert(`Error: ${error.message}. Note: Gemini API key required for program generation.`);
      setIsGenerating(false);
      setStep(5); // Go back to weight goal step
    }
  };

  const handleComplete = () => {
    // Navigate to home
    setLocation("/");
  };

  return (
    <MobileShell hideNav={true}>
      {/* Progress Indicator */}
      {step <= 5 && (
        <div className="fixed top-0 left-0 right-0 max-w-md mx-auto h-1 bg-elevated z-50">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      )}

      {step === 1 && (
        <ProfileStep
          data={data}
          updateData={updateData}
          onNext={nextStep}
        />
      )}

      {step === 2 && (
        <ScheduleStep
          data={data}
          updateData={updateData}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}

      {step === 3 && (
        <EquipmentStep
          data={data}
          updateData={updateData}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}

      {step === 4 && (
        <GoalsStep
          data={data}
          updateData={updateData}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}

      {step === 5 && (
        <WeightGoalStep
          data={data}
          updateData={updateData}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}

      {step === 6 && (
        <GeneratingStep isGenerating={isGenerating} />
      )}

      {step === 7 && generatedProgram && (
        <ProgramPreview
          program={generatedProgram}
          onComplete={handleComplete}
        />
      )}
    </MobileShell>
  );
}
