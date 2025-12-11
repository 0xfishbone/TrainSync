import { useState } from "react";
import { OnboardingData } from "./index";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Check, Dumbbell, Home, Mountain } from "lucide-react";

interface EquipmentStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const EQUIPMENT_OPTIONS = [
  { key: "dumbbells", label: "Dumbbells" },
  { key: "barbell", label: "Barbell" },
  { key: "kettlebells", label: "Kettlebells" },
  { key: "pullup_bar", label: "Pull-up Bar" },
  { key: "punching_bag", label: "Punching Bag" },
  { key: "jump_rope", label: "Jump Rope" },
  { key: "resistance_bands", label: "Resistance Bands" },
  { key: "bench", label: "Bench" },
  { key: "squat_rack", label: "Squat Rack" },
  { key: "bodyweight", label: "Just Bodyweight" },
];

const LOCATION_OPTIONS = [
  { key: "gym", label: "Gym", icon: Dumbbell },
  { key: "home", label: "Home", icon: Home },
  { key: "outdoor", label: "Outdoor", icon: Mountain },
];

export function EquipmentStep({ data, updateData, onNext, onBack }: EquipmentStepProps) {
  const [location, setLocation] = useState(data.trainingLocation || "gym");
  const [equipment, setEquipment] = useState<string[]>(data.equipmentAvailable || []);

  const toggleEquipment = (item: string) => {
    if (equipment.includes(item)) {
      setEquipment(equipment.filter((e) => e !== item));
    } else {
      setEquipment([...equipment, item]);
    }
  };

  const canContinue = equipment.length > 0;

  const handleNext = () => {
    updateData({
      trainingLocation: location,
      equipmentAvailable: equipment,
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
        <h1 className="text-2xl font-display font-bold">Equipment Available</h1>
        <p className="text-secondary text-sm">What can you use for training?</p>
      </header>

      <div className="space-y-8 flex-1">
        <div className="space-y-3">
          <Label className="text-xs font-bold text-tertiary uppercase tracking-wider">
            Training location
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {LOCATION_OPTIONS.map((loc) => (
              <button
                key={loc.key}
                onClick={() => setLocation(loc.key)}
                className={`h-20 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                  location === loc.key
                    ? "border-primary bg-primary/10"
                    : "border-border bg-elevated hover:border-primary/50"
                }`}
              >
                <loc.icon className="w-6 h-6" />
                <span className="font-bold text-sm">{loc.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-bold text-tertiary uppercase tracking-wider">
            Select all that apply
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {EQUIPMENT_OPTIONS.map((item) => (
              <button
                key={item.key}
                onClick={() => toggleEquipment(item.key)}
                className={`h-14 rounded-xl border-2 transition-all flex items-center justify-between px-4 ${
                  equipment.includes(item.key)
                    ? "border-primary bg-primary/10"
                    : "border-border bg-elevated hover:border-primary/50"
                }`}
              >
                <span className="font-medium">{item.label}</span>
                {equipment.includes(item.key) && (
                  <Check size={18} className="text-primary" />
                )}
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
      </div>
    </div>
  );
}
