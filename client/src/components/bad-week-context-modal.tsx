import { useState } from "react";
import { MessageSquare, CheckCircle2 } from "lucide-react";

interface BadWeekContextModalProps {
  onContextProvided: (reasons: string[], notes: string) => void;
  onSkip: () => void;
  weekEndDate: Date;
}

const COMMON_REASONS = [
  { id: "work_busy", label: "Work was crazy busy", emoji: "💼" },
  { id: "travel", label: "Traveling", emoji: "✈️" },
  { id: "sick", label: "Feeling sick", emoji: "🤒" },
  { id: "injury", label: "Dealing with injury", emoji: "🤕" },
  { id: "family", label: "Family commitments", emoji: "👨‍👩‍👧" },
  { id: "stress", label: "High stress/anxiety", emoji: "😰" },
  { id: "unmotivated", label: "Just wasn't feeling it", emoji: "😔" },
  { id: "sleep", label: "Poor sleep", emoji: "😴" },
  { id: "other", label: "Something else", emoji: "🤷" },
];

export function BadWeekContextModal({
  onContextProvided,
  onSkip,
  weekEndDate,
}: BadWeekContextModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const toggleReason = (reasonId: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reasonId)
        ? prev.filter((id) => id !== reasonId)
        : [...prev, reasonId]
    );
  };

  const handleSubmit = () => {
    if (selectedReasons.length === 0 && notes.trim() === "") {
      // Must provide at least something
      return;
    }

    onContextProvided(selectedReasons, notes.trim());
  };

  const weekEndStr = weekEndDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-8 border border-border/30 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={32} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">What Happened?</h2>
          <p className="text-secondary text-sm">
            Last week (ending {weekEndStr}) didn't go as planned. That's okay—life happens!
          </p>
          <p className="text-secondary text-sm mt-2">
            Help us understand so we can adjust your plan.
          </p>
        </div>

        {/* No Penalty Message */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-100">
            <strong>No penalties.</strong> We won't punish you for a tough week.
            We'll just adapt your program to help you bounce back.
          </p>
        </div>

        {/* Common Reasons */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">
            What got in the way? (select all that apply)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {COMMON_REASONS.map((reason) => (
              <button
                key={reason.id}
                onClick={() => toggleReason(reason.id)}
                className={`p-3 rounded-xl border transition-all ${
                  selectedReasons.includes(reason.id)
                    ? "bg-primary/20 border-primary text-foreground"
                    : "bg-elevated border-border/30 text-secondary hover:border-border/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{reason.emoji}</span>
                  <span className="text-sm flex-1 text-left">{reason.label}</span>
                  {selectedReasons.includes(reason.id) && (
                    <CheckCircle2 size={16} className="text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Free-form Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Anything else you want to share?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Totally optional. But if there's context that helps, let us know!"
            className="w-full px-4 py-3 rounded-xl bg-elevated border border-border/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={4}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSubmit}
            disabled={selectedReasons.length === 0 && notes.trim() === ""}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit & Continue
          </button>
          <button
            onClick={onSkip}
            className="w-full bg-transparent border border-border/30 text-secondary py-3 rounded-xl font-medium hover:bg-elevated transition-colors"
          >
            Skip for Now
          </button>
        </div>

        <p className="text-xs text-center text-secondary mt-4">
          We use this to create a recovery plan that fits your situation.
        </p>
      </div>
    </div>
  );
}
