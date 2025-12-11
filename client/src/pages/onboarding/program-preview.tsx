import { Button } from "@/components/ui/button";
import { Check, ChevronRight, X, Clock, Dumbbell } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProgramPreviewProps {
  program: any;
  onComplete: () => void;
}

export function ProgramPreview({ program, onComplete }: ProgramPreviewProps) {
  const weekProgram = program.weekProgram;
  const template = program.template;
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Get schedule from week program workouts
  const schedule = weekProgram?.workouts || {};
  const days = Object.keys(schedule);

  const selectedDayWorkout = selectedDay ? schedule[selectedDay] : null;

  return (
    <div className="p-6 pt-12 space-y-8 min-h-screen flex flex-col">
      {/* Success checkmark */}
      <div className="flex flex-col items-center space-y-3">
        <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center">
          <Check size={40} className="text-success" />
        </div>
        <h1 className="text-2xl font-display font-bold text-center">Your Program is Ready!</h1>
        <p className="text-secondary text-sm text-center">AI-generated and personalized for you</p>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto">
        {/* Program name */}
        <div className="bg-surface rounded-2xl p-5 shadow-lg border border-white/5">
          <h2 className="text-xl font-bold mb-1">{template?.programName || "Custom Program"}</h2>
          <p className="text-secondary text-sm">
            {days.length} days/week • Personalized for your goals
          </p>
        </div>

        {/* Weekly schedule */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-tertiary uppercase tracking-wider">
            This Week's Schedule
          </h3>
          {days.slice(0, 7).map((day: string) => {
            const workout = schedule[day];
            const exerciseCount = workout?.exercises?.length || 0;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className="bg-surface rounded-xl p-4 border border-border flex items-center justify-between hover:bg-elevated transition-colors active:scale-98 cursor-pointer w-full text-left"
              >
                <div>
                  <div className="font-bold capitalize">{day}</div>
                  <div className="text-sm text-secondary">
                    {workout?.sessionName || "Rest Day"} • {exerciseCount} exercises
                  </div>
                </div>
                <ChevronRight size={20} className="text-tertiary" />
              </button>
            );
          })}
        </div>

        {/* Nutrition summary */}
        {weekProgram?.nutritionGuidance && (
          <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
            <div className="font-bold text-xs text-primary mb-2 uppercase tracking-wider">
              💡 Nutrition Guidance
            </div>
            <p className="text-sm">{weekProgram.nutritionGuidance}</p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6 space-y-3">
        <Button
          onClick={onComplete}
          className="w-full h-14 text-lg shadow-lg shadow-primary/20"
          size="lg"
        >
          Let's Go! 🚀
        </Button>
        <p className="text-center text-xs text-tertiary">
          Your program adapts weekly based on your performance
        </p>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && selectedDayWorkout && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-surface w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-surface border-b border-border p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold capitalize">{selectedDay}</h2>
                <p className="text-sm text-secondary">
                  {selectedDayWorkout.sessionName} • {selectedDayWorkout.exercises?.length || 0} exercises
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center hover:bg-surface border border-border active:scale-95 transition-transform"
              >
                <X size={20} className="text-secondary" />
              </button>
            </div>

            {/* Exercise List */}
            <div className="p-6 space-y-4">
              {selectedDayWorkout.exercises?.map((exercise: any, index: number) => (
                <div
                  key={index}
                  className="bg-elevated rounded-xl p-4 border border-border space-y-3"
                >
                  {/* Exercise Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{exercise.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-secondary">
                        {exercise.type === "timed" ? (
                          <>
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {exercise.rounds} rounds
                            </span>
                            <span>•</span>
                            <span>{exercise.workTime}s work / {exercise.restTime}s rest</span>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1">
                              <Dumbbell size={14} />
                              {exercise.sets} sets
                            </span>
                            <span>•</span>
                            <span>{exercise.reps} reps</span>
                            {exercise.weight && (
                              <>
                                <span>•</span>
                                <span>{exercise.weight}kg</span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                      #{index + 1}
                    </div>
                  </div>

                  {/* Instructions */}
                  {exercise.instructions && (
                    <div className="bg-surface rounded-lg p-3">
                      <p className="text-sm font-medium text-tertiary mb-1">Form Cues</p>
                      <p className="text-sm">{exercise.instructions}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {exercise.notes && (
                    <div className="text-sm text-secondary italic">
                      💡 {exercise.notes}
                    </div>
                  )}

                  {/* Progression */}
                  {exercise.progression && (
                    <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                      <p className="text-xs font-bold text-success mb-1">PROGRESSION</p>
                      <p className="text-sm">
                        {exercise.progression.type === "weight" && `Add ${exercise.progression.amount}kg `}
                        {exercise.progression.type === "reps" && `Add ${exercise.progression.amount} reps `}
                        {exercise.progression.type === "rounds" && `Add ${exercise.progression.amount} round `}
                        {exercise.progression.conditions}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-surface border-t border-border p-6">
              <Button
                onClick={() => setSelectedDay(null)}
                className="w-full h-12"
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
