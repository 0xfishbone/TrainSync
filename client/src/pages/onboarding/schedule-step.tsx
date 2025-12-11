import { useState } from "react";
import { OnboardingData } from "./index";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronLeft } from "lucide-react";

interface ScheduleStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const DAYS = [
  { key: "monday", label: "M", full: "Monday" },
  { key: "tuesday", label: "T", full: "Tuesday" },
  { key: "wednesday", label: "W", full: "Wednesday" },
  { key: "thursday", label: "T", full: "Thursday" },
  { key: "friday", label: "F", full: "Friday" },
  { key: "saturday", label: "S", full: "Saturday" },
  { key: "sunday", label: "S", full: "Sunday" },
];

export function ScheduleStep({ data, updateData, onNext, onBack }: ScheduleStepProps) {
  const [daysPerWeek, setDaysPerWeek] = useState(data.trainingDaysPerWeek || 5);
  const [selectedDays, setSelectedDays] = useState<string[]>(data.availableDays || []);
  const [duration, setDuration] = useState(data.sessionDuration || 60);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const canContinue = selectedDays.length > 0 && selectedDays.length === daysPerWeek;

  const handleNext = () => {
    updateData({
      trainingDaysPerWeek: daysPerWeek,
      availableDays: selectedDays,
      sessionDuration: duration,
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
        <h1 className="text-2xl font-display font-bold">Training Schedule</h1>
        <p className="text-secondary text-sm">When can you train?</p>
      </header>

      <div className="space-y-8 flex-1">
        <div className="space-y-3">
          <Label className="text-xs font-bold text-tertiary uppercase tracking-wider">
            Days per week
          </Label>
          <div className="grid grid-cols-5 gap-3">
            {[3, 4, 5, 6, 7].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setDaysPerWeek(num);
                  // Clear selected days if changing count
                  if (selectedDays.length > num) {
                    setSelectedDays(selectedDays.slice(0, num));
                  }
                }}
                className={`h-14 rounded-xl border-2 font-bold text-lg transition-all ${
                  daysPerWeek === num
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-elevated hover:border-primary/50"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-bold text-tertiary uppercase tracking-wider">
            Which days?
          </Label>
          <p className="text-xs text-secondary">Select {daysPerWeek} days</p>
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day) => (
              <button
                key={day.key}
                onClick={() => toggleDay(day.key)}
                disabled={!selectedDays.includes(day.key) && selectedDays.length >= daysPerWeek}
                className={`aspect-square rounded-xl border-2 font-bold transition-all ${
                  selectedDays.includes(day.key)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-elevated hover:border-primary/50 disabled:opacity-30"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {selectedDays.length > 0 && (
            <p className="text-xs text-tertiary">
              {selectedDays.map((d) => DAYS.find((day) => day.key === d)?.full).join(", ")}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-bold text-tertiary uppercase tracking-wider">
            Session duration
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {[45, 60, 90].map((mins) => (
              <button
                key={mins}
                onClick={() => setDuration(mins)}
                className={`h-14 rounded-xl border-2 font-bold transition-all ${
                  duration === mins
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-elevated hover:border-primary/50"
                }`}
              >
                {mins} min
              </button>
            ))}
          </div>
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
        {!canContinue && selectedDays.length !== daysPerWeek && (
          <p className="text-center text-xs text-destructive mt-2">
            Please select exactly {daysPerWeek} days
          </p>
        )}
      </div>
    </div>
  );
}
