import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ChevronLeft, TrendingUp, TrendingDown, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NutritionTargets() {
  const [, setLocation] = useLocation();
  const [dailyCalories, setDailyCalories] = useState(0);
  const [dailyProtein, setDailyProtein] = useState(0);
  const [weeklyWeightChange, setWeeklyWeightChange] = useState(0);
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
        setDailyCalories(data.dailyCaloriesTarget || 0);
        setDailyProtein(data.dailyProteinTarget || 0);
        setWeeklyWeightChange(data.weeklyWeightChangeTarget || 0);
      })
      .catch((err) => {
        console.error("Failed to load nutrition targets", err);
        toast.error("Failed to load targets");
      })
      .finally(() => setIsLoading(false));
  }, [setLocation]);

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
          dailyCaloriesTarget: dailyCalories,
          dailyProteinTarget: dailyProtein,
          weeklyWeightChangeTarget: weeklyWeightChange,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Nutrition targets updated");
      setLocation("/profile");
    } catch (error) {
      console.error("Failed to save nutrition targets", error);
      toast.error("Failed to save targets");
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
            <h1 className="text-xl font-display font-bold">Nutrition Targets</h1>
          </div>
        </header>

        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-secondary">Loading...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Daily Calories */}
            <div className="space-y-3">
              <Label className="text-sm font-bold text-tertiary uppercase tracking-wider">
                Daily Calories
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  value={dailyCalories}
                  onChange={(e) => setDailyCalories(parseInt(e.target.value) || 0)}
                  className="text-lg font-bold pr-20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary">
                  cal/day
                </span>
              </div>
            </div>

            {/* Daily Protein */}
            <div className="space-y-3">
              <Label className="text-sm font-bold text-tertiary uppercase tracking-wider">
                Daily Protein
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  value={dailyProtein}
                  onChange={(e) => setDailyProtein(parseInt(e.target.value) || 0)}
                  className="text-lg font-bold pr-20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary">
                  g/day
                </span>
              </div>
            </div>

            {/* Weekly Weight Goal */}
            <div className="space-y-3">
              <Label className="text-sm font-bold text-tertiary uppercase tracking-wider">
                Weekly Weight Goal
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={weeklyWeightChange}
                  onChange={(e) => setWeeklyWeightChange(parseFloat(e.target.value) || 0)}
                  className="text-lg font-bold pr-24"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary">
                  kg/week
                </span>
              </div>

              {/* Visual indicator */}
              <div className="flex items-center gap-2 text-sm">
                {weeklyWeightChange > 0 ? (
                  <>
                    <TrendingUp size={16} className="text-green-500" />
                    <span className="text-green-500">
                      Gaining {weeklyWeightChange.toFixed(1)} kg per week
                    </span>
                  </>
                ) : weeklyWeightChange < 0 ? (
                  <>
                    <TrendingDown size={16} className="text-blue-500" />
                    <span className="text-blue-500">
                      Losing {Math.abs(weeklyWeightChange).toFixed(1)} kg per week
                    </span>
                  </>
                ) : (
                  <>
                    <Target size={16} className="text-secondary" />
                    <span className="text-secondary">Maintaining weight</span>
                  </>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-2">
              <p className="text-sm font-bold">About These Targets</p>
              <p className="text-xs text-secondary">
                These targets are used to track your daily nutrition and calculate whether you're on track with your goals. Update them if your goals change.
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving || dailyCalories === 0 || dailyProtein === 0}
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
