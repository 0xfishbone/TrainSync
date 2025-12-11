import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ChevronLeft, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function Appearance() {
  const [, setLocation] = useLocation();
  const [theme, setTheme] = useState("dark");
  const [units, setUnits] = useState("metric");
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
        setUnits(data.units || "metric");
        // Theme is always dark for now (no light mode implemented)
        setTheme("dark");
      })
      .catch((err) => {
        console.error("Failed to load appearance settings", err);
        toast.error("Failed to load settings");
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
          units,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Appearance settings updated");
      setLocation("/profile");
    } catch (error) {
      console.error("Failed to save appearance settings", error);
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
            <h1 className="text-xl font-display font-bold">Appearance</h1>
          </div>
        </header>

        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-secondary">Loading...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Theme */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-tertiary uppercase tracking-wider">
                Theme
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setTheme("dark")}
                  className={`w-full h-14 rounded-xl font-medium transition-all text-left px-4 flex items-center justify-between ${
                    theme === "dark"
                      ? "bg-primary/10 border-2 border-primary text-white"
                      : "bg-elevated border border-border text-secondary hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Moon size={20} />
                    <span>Dark Mode</span>
                  </div>
                  {theme === "dark" && <span className="text-primary">✓</span>}
                </button>
                <button
                  onClick={() => toast.info("Light mode coming soon!")}
                  disabled
                  className="w-full h-14 rounded-xl font-medium text-left px-4 flex items-center justify-between bg-elevated border border-border text-tertiary opacity-50 cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <Sun size={20} />
                    <span>Light Mode</span>
                    <span className="text-xs">(Coming Soon)</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Units */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-tertiary uppercase tracking-wider">
                Units
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setUnits("metric")}
                  className={`w-full h-14 rounded-xl font-medium transition-all text-left px-4 flex items-center justify-between ${
                    units === "metric"
                      ? "bg-primary/10 border-2 border-primary text-white"
                      : "bg-elevated border border-border text-secondary hover:border-primary/50"
                  }`}
                >
                  <div>
                    <p className="font-bold">Metric</p>
                    <p className="text-xs text-secondary">kg, cm, liters</p>
                  </div>
                  {units === "metric" && <span className="text-primary">✓</span>}
                </button>
                <button
                  onClick={() => setUnits("imperial")}
                  className={`w-full h-14 rounded-xl font-medium transition-all text-left px-4 flex items-center justify-between ${
                    units === "imperial"
                      ? "bg-primary/10 border-2 border-primary text-white"
                      : "bg-elevated border border-border text-secondary hover:border-primary/50"
                  }`}
                >
                  <div>
                    <p className="font-bold">Imperial</p>
                    <p className="text-xs text-secondary">lbs, ft/in, fl oz</p>
                  </div>
                  {units === "imperial" && <span className="text-primary">✓</span>}
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="bg-secondary/10 border border-border rounded-xl p-4">
              <p className="text-xs text-secondary">
                Note: Changing units will update how weights and measurements are displayed throughout the app. Historical data remains unchanged.
              </p>
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
