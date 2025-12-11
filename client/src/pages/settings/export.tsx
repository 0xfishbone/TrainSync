import { useState } from "react";
import { useLocation } from "wouter";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ChevronLeft, Download, FileText, Utensils, Scale, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function ExportData() {
  const [, setLocation] = useLocation();
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const exportWorkouts = async () => {
    setIsExporting("workouts");
    try {
      // Simulated export - in production this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Workout history exported", {
        description: "CSV file downloaded to your device",
      });
    } catch (error) {
      toast.error("Failed to export workouts");
    } finally {
      setIsExporting(null);
    }
  };

  const exportMeals = async () => {
    setIsExporting("meals");
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Meal logs exported", {
        description: "CSV file downloaded to your device",
      });
    } catch (error) {
      toast.error("Failed to export meals");
    } finally {
      setIsExporting(null);
    }
  };

  const exportWeight = async () => {
    setIsExporting("weight");
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Weight history exported", {
        description: "CSV file downloaded to your device",
      });
    } catch (error) {
      toast.error("Failed to export weight");
    } finally {
      setIsExporting(null);
    }
  };

  const exportAll = async () => {
    setIsExporting("all");
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Complete archive exported", {
        description: "ZIP file downloaded to your device",
      });
    } catch (error) {
      toast.error("Failed to export archive");
    } finally {
      setIsExporting(null);
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
            <h1 className="text-xl font-display font-bold">Export Data</h1>
          </div>
        </header>

        <div className="p-6 space-y-6">
          <p className="text-secondary text-sm">
            Download your training history and nutrition logs as CSV files. You can import these into spreadsheet apps.
          </p>

          {/* Available Exports */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-tertiary uppercase tracking-wider">
              Available Exports
            </label>

            <div className="space-y-3">
              {/* Workout History */}
              <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={24} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Workout History</h3>
                    <p className="text-xs text-secondary mb-3">
                      All completed workouts with exercises, sets, reps, and weights
                    </p>
                    <Button
                      onClick={exportWorkouts}
                      disabled={isExporting !== null}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {isExporting === "workouts" ? (
                        "Exporting..."
                      ) : (
                        <>
                          <Download size={16} className="mr-2" />
                          Download CSV
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Nutrition Logs */}
              <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                    <Utensils size={24} className="text-warning" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Nutrition Logs</h3>
                    <p className="text-xs text-secondary mb-3">
                      All logged meals with calories, protein, and timestamps
                    </p>
                    <Button
                      onClick={exportMeals}
                      disabled={isExporting !== null}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {isExporting === "meals" ? (
                        "Exporting..."
                      ) : (
                        <>
                          <Download size={16} className="mr-2" />
                          Download CSV
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Weight Entries */}
              <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                    <Scale size={24} className="text-success" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Weight History</h3>
                    <p className="text-xs text-secondary mb-3">
                      All weigh-ins with dates and notes
                    </p>
                    <Button
                      onClick={exportWeight}
                      disabled={isExporting !== null}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {isExporting === "weight" ? (
                        "Exporting..."
                      ) : (
                        <>
                          <Download size={16} className="mr-2" />
                          Download CSV
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Complete Archive */}
              <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Package size={24} className="text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Complete Archive</h3>
                    <p className="text-xs text-secondary mb-3">
                      Everything (workouts, meals, weight) in one ZIP file
                    </p>
                    <Button
                      onClick={exportAll}
                      disabled={isExporting !== null}
                      size="sm"
                      className="w-full"
                    >
                      {isExporting === "all" ? (
                        "Creating Archive..."
                      ) : (
                        <>
                          <Download size={16} className="mr-2" />
                          Download Archive
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-secondary/10 border border-border rounded-xl p-4">
            <p className="text-xs text-secondary">
              <strong>Note:</strong> Files will download to your device. CSV files can be opened in Excel, Google Sheets, or any spreadsheet app.
            </p>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
