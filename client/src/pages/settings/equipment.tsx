import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ChevronLeft, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EQUIPMENT_OPTIONS = [
  "Dumbbells",
  "Barbell",
  "Bench",
  "Pull-up bar",
  "Stationary bike",
  "Kettlebells",
  "Resistance bands",
  "Rowing machine",
  "Squat rack",
  "Cable machine",
];

const INJURY_OPTIONS = [
  "Shoulder issues",
  "Knee problems",
  "Lower back pain",
  "Wrist pain",
  "Ankle problems",
  "Neck issues",
];

export default function EquipmentLimits() {
  const [, setLocation] = useLocation();
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedInjuries, setSelectedInjuries] = useState<string[]>([]);
  const [exercisesToAvoid, setExercisesToAvoid] = useState<string[]>([]);
  const [newExercise, setNewExercise] = useState("");
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
        setSelectedEquipment(data.equipmentAvailable || []);
        setSelectedInjuries(data.injuries || []);
        setExercisesToAvoid(data.exercisesToAvoid || []);
      })
      .catch((err) => {
        console.error("Failed to load equipment settings", err);
        toast.error("Failed to load settings");
      })
      .finally(() => setIsLoading(false));
  }, [setLocation]);

  const toggleEquipment = (equipment: string) => {
    if (selectedEquipment.includes(equipment)) {
      setSelectedEquipment(selectedEquipment.filter(e => e !== equipment));
    } else {
      setSelectedEquipment([...selectedEquipment, equipment]);
    }
  };

  const toggleInjury = (injury: string) => {
    if (selectedInjuries.includes(injury)) {
      setSelectedInjuries(selectedInjuries.filter(i => i !== injury));
    } else {
      setSelectedInjuries([...selectedInjuries, injury]);
    }
  };

  const addExercise = () => {
    if (newExercise.trim() && !exercisesToAvoid.includes(newExercise.trim())) {
      setExercisesToAvoid([...exercisesToAvoid, newExercise.trim()]);
      setNewExercise("");
    }
  };

  const removeExercise = (exercise: string) => {
    setExercisesToAvoid(exercisesToAvoid.filter(e => e !== exercise));
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
          equipmentAvailable: selectedEquipment,
          injuries: selectedInjuries,
          exercisesToAvoid,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Equipment & limits updated");
      setLocation("/profile");
    } catch (error) {
      console.error("Failed to save equipment settings", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MobileShell hideNav={true}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <button
              onClick={() => setLocation("/profile")}
              className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-border active:scale-95 transition-transform"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-xl font-display font-bold">Equipment & Limits</h1>
          </div>
        </header>

        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-secondary">Loading...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Available Equipment */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-tertiary uppercase tracking-wider">
                Available Equipment
              </label>
              <div className="space-y-2">
                {EQUIPMENT_OPTIONS.map((equipment) => (
                  <button
                    key={equipment}
                    onClick={() => toggleEquipment(equipment)}
                    className={`w-full h-12 rounded-xl font-medium transition-all text-left px-4 flex items-center justify-between ${
                      selectedEquipment.includes(equipment)
                        ? "bg-primary/10 border-2 border-primary text-white"
                        : "bg-elevated border border-border text-secondary hover:border-primary/50"
                    }`}
                  >
                    <span>{equipment}</span>
                    {selectedEquipment.includes(equipment) && (
                      <span className="text-primary">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Injuries & Limitations */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-tertiary uppercase tracking-wider">
                Injuries & Limitations
              </label>
              <div className="space-y-2">
                {INJURY_OPTIONS.map((injury) => (
                  <button
                    key={injury}
                    onClick={() => toggleInjury(injury)}
                    className={`w-full h-12 rounded-xl font-medium transition-all text-left px-4 flex items-center justify-between ${
                      selectedInjuries.includes(injury)
                        ? "bg-warning/10 border-2 border-warning text-white"
                        : "bg-elevated border border-border text-secondary hover:border-warning/50"
                    }`}
                  >
                    <span>{injury}</span>
                    {selectedInjuries.includes(injury) && (
                      <span className="text-warning">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercises to Avoid */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-tertiary uppercase tracking-wider">
                Exercises to Avoid
              </label>

              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Add exercise name"
                  value={newExercise}
                  onChange={(e) => setNewExercise(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addExercise()}
                  className="flex-1"
                />
                <Button onClick={addExercise} variant="outline">Add</Button>
              </div>

              {exercisesToAvoid.length > 0 ? (
                <div className="space-y-2">
                  {exercisesToAvoid.map((exercise) => (
                    <div
                      key={exercise}
                      className="flex items-center justify-between p-3 bg-elevated rounded-xl border border-border"
                    >
                      <span className="text-secondary">{exercise}</span>
                      <button
                        onClick={() => removeExercise(exercise)}
                        className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-secondary">No exercises to avoid</p>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
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
