import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const DAYS_OF_WEEK = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

export default function TrainingSchedule() {
  const [, setLocation] = useLocation();
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("trainsync_user_id");
    if (!userId) {
      setLocation("/onboarding");
      return;
    }

    fetch("/api/profile", {
      headers: { "x-user-id": userId },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        setDaysPerWeek(data.trainingDaysPerWeek || 5);
        setSelectedDays(data.availableDays || []);
        setSessionDuration(data.sessionDuration || 60);
      })
      .catch((err) => {
        console.error("Failed to load schedule", err);
        toast.error("Failed to load schedule");
      })
      .finally(() => setIsLoading(false));
  }, [setLocation]);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSave = async () => {
    const userId = localStorage.getItem("trainsync_user_id");
    if (!userId) return;

    setIsSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          trainingDaysPerWeek: daysPerWeek,
          availableDays: selectedDays,
          sessionDuration,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Training schedule updated");
      setLocation("/profile");
    } catch (error) {
      console.error("Failed to save schedule", error);
      toast.error("Failed to save schedule");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MobileShell hideNav={true}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <button
              onClick={() => setLocation("/profile")}
              className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-border active:scale-95 transition-transform"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-xl font-display font-bold">Training Schedule</h1>
          </div>
        </header>

        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-secondary">Loading...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Days Per Week */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-tertiary uppercase tracking-wider">
                Days Per Week
              </label>
              <div className="flex gap-2">
                {[3, 4, 5, 6, 7].map((num) => (
                  <button
                    key={num}
                    onClick={() => setDaysPerWeek(num)}
                    className={`flex-1 h-12 rounded-xl font-bold transition-all ${
                      daysPerWeek === num
                        ? "bg-primary text-white"
                        : "bg-elevated text-secondary border border-border hover:border-primary/50"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Which Days */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-tertiary uppercase tracking-wider">
                Which Days?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={`h-12 rounded-xl font-bold transition-all ${
                      selectedDays.includes(day.value)
                        ? "bg-primary text-white"
                        : "bg-elevated text-secondary border border-border hover:border-primary/50"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-secondary">
                {selectedDays.length} day{selectedDays.length !== 1 ? "s" : ""} selected
              </p>
            </div>

            {/* Session Duration */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-tertiary uppercase tracking-wider">
                Session Duration
              </label>
              <div className="space-y-2">
                {[30, 60, 90].map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setSessionDuration(duration)}
                    className={`w-full h-12 rounded-xl font-medium transition-all text-left px-4 ${
                      sessionDuration === duration
                        ? "bg-primary/10 border-2 border-primary text-white"
                        : "bg-elevated border border-border text-secondary hover:border-primary/50"
                    }`}
                  >
                    {duration} minutes
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving || selectedDays.length === 0}
                className="w-full h-14 text-lg"
                size="lg"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
