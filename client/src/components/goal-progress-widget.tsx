import { TrendingUp, TrendingDown, Target, Calendar } from "lucide-react";

interface GoalProgressWidgetProps {
  goalProgress: {
    progressPercent: number;
    status: "ahead" | "on_track" | "behind" | "off_track" | "goal_reached";
    daysToGoal: number | null;
    currentWeight: number;
    targetWeightMin: number;
    targetWeightMax: number;
    currentChange: number;
    totalChange: number;
  };
  onManageGoal?: () => void;
}

export function GoalProgressWidget({ goalProgress, onManageGoal }: GoalProgressWidgetProps) {
  const {
    progressPercent = 0,
    status = "on_track",
    daysToGoal = null,
    currentWeight = 0,
    targetWeightMin = 0,
    targetWeightMax = 0,
    currentChange = 0,
    totalChange = 0,
  } = goalProgress || {};

  // Don't render if critical data is missing
  if (!goalProgress || currentWeight === 0) {
    return null;
  }

  // Get status-specific styling and messaging
  const getStatusConfig = () => {
    switch (status) {
      case "goal_reached":
        return {
          color: "#10b981",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          emoji: "🎉",
          title: "Goal Reached!",
          subtitle: "Time to set a new challenge",
        };
      case "ahead":
        return {
          color: "#10b981",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          emoji: "🚀",
          title: "Ahead of Schedule",
          subtitle: daysToGoal ? `~${daysToGoal} days to goal` : "Making great progress",
        };
      case "on_track":
        return {
          color: "#3b82f6",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          emoji: "💪",
          title: "On Track",
          subtitle: daysToGoal ? `~${daysToGoal} days to goal` : "Steady progress",
        };
      case "behind":
        return {
          color: "#f59e0b",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          emoji: "⚡",
          title: "Slightly Behind",
          subtitle: "Let's get back on track",
        };
      case "off_track":
        return {
          color: "#ef4444",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          emoji: "🎯",
          title: "Off Track",
          subtitle: "Consider adjusting your goal",
        };
    }
  };

  const config = getStatusConfig();
  const isGaining = totalChange > 0;

  return (
    <div
      className={`rounded-2xl p-6 border ${config.bgColor} ${config.borderColor}`}
      onClick={onManageGoal}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{config.emoji}</div>
          <div>
            <h3 className="font-bold text-lg">{config.title}</h3>
            <p className="text-sm text-secondary">{config.subtitle}</p>
          </div>
        </div>
        {onManageGoal && (
          <button className="text-primary text-sm font-medium hover:underline">
            Manage
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-secondary">Progress</span>
          <span className="text-sm font-bold" style={{ color: config.color }}>
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="h-3 bg-surface rounded-full overflow-hidden border border-border/20">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(progressPercent, 100)}%`,
              backgroundColor: config.color,
            }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Current Weight */}
        <div className="bg-surface rounded-xl p-3 border border-border/20">
          <div className="flex items-center gap-2 mb-1">
            {isGaining ? (
              <TrendingUp size={16} className="text-green-500" />
            ) : (
              <TrendingDown size={16} className="text-blue-500" />
            )}
            <span className="text-xs text-secondary">Current</span>
          </div>
          <div className="text-lg font-bold">{currentWeight.toFixed(1)} kg</div>
          <p className="text-xs text-secondary mt-1">
            {currentChange > 0 ? "+" : ""}
            {currentChange.toFixed(1)} kg
          </p>
        </div>

        {/* Target Weight */}
        <div className="bg-surface rounded-xl p-3 border border-border/20">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-primary" />
            <span className="text-xs text-secondary">Target</span>
          </div>
          <div className="text-lg font-bold">
            {targetWeightMin === targetWeightMax
              ? `${targetWeightMin.toFixed(1)} kg`
              : `${targetWeightMin.toFixed(1)}-${targetWeightMax.toFixed(1)} kg`}
          </div>
          <p className="text-xs text-secondary mt-1">
            {Math.abs(totalChange - currentChange).toFixed(1)} kg to go
          </p>
        </div>
      </div>

      {/* Timeline */}
      {daysToGoal !== null && status !== "goal_reached" && (
        <div className="mt-4 flex items-center gap-2 text-sm text-secondary">
          <Calendar size={16} />
          <span>
            Estimated completion: {Math.round(daysToGoal / 7)} weeks
            {status === "ahead" && " (faster than planned!)"}
            {status === "behind" && " (slower than planned)"}
          </span>
        </div>
      )}
    </div>
  );
}
