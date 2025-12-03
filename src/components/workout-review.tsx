"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Plus, Check, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WorkoutSession } from "@/types";

interface WorkoutReviewProps {
  completedSessions: WorkoutSession[];
  recentSessions: WorkoutSession[];
  onUpdateWorkout: (workoutId: string, newWeight: number) => Promise<void>;
}

interface WorkoutReviewItem {
  session: WorkoutSession;
  previousSession: WorkoutSession | null;
  progressType: "improved" | "maintained" | "decreased" | "first";
  progressAmount: number;
  suggestion: number;
}

export function WorkoutReview({
  completedSessions,
  recentSessions,
  onUpdateWorkout,
}: WorkoutReviewProps) {
  const [updatingWorkouts, setUpdatingWorkouts] = useState<Set<string>>(new Set());
  const [adjustments, setAdjustments] = useState<Map<string, number>>(new Map());

  // Analyze each completed workout
  const reviewItems: WorkoutReviewItem[] = completedSessions.map((session) => {
    const workout = session.workout;
    const currentWeight = session.weightUsed || workout.weight;

    // Find previous completed sessions for this workout
    const previousSessions = recentSessions
      .filter((s) => s.workoutId === workout.id && s.completed && s.id !== session.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const previousSession = previousSessions[0] || null;

    if (!previousSession) {
      // First time completing this workout
      return {
        session,
        previousSession,
        progressType: "first" as const,
        progressAmount: 0,
        suggestion: 0,
      };
    }

    const previousWeight = previousSession.weightUsed || previousSession.workout.weight;
    const progressAmount = currentWeight - previousWeight;

    let progressType: "improved" | "maintained" | "decreased";
    let suggestion = 0;

    if (workout.workoutType === "weight") {
      if (progressAmount > 0) {
        progressType = "improved";
        // If they improved, suggest maintaining or a small increase
        suggestion = Math.max(2.5, Math.round((currentWeight * 0.025) / 2.5) * 2.5); // 2.5% rounded to 2.5kg
      } else if (progressAmount === 0) {
        progressType = "maintained";
        // If maintained and completed all sets, suggest 5% increase
        suggestion = Math.max(2.5, Math.round((currentWeight * 0.05) / 2.5) * 2.5); // 5% rounded to 2.5kg
      } else {
        progressType = "decreased";
        suggestion = 0; // No suggestion for decreased weight
      }
    } else {
      // Time-based workout
      if (progressAmount > 0) {
        progressType = "improved";
        suggestion = Math.max(5, Math.round(currentWeight * 0.05)); // 5% or 5 min minimum
      } else if (progressAmount === 0) {
        progressType = "maintained";
        suggestion = Math.max(5, Math.round(currentWeight * 0.1)); // 10% or 5 min minimum
      } else {
        progressType = "decreased";
        suggestion = 0;
      }
    }

    return {
      session,
      previousSession,
      progressType,
      progressAmount,
      suggestion,
    };
  });

  const handleAdjustment = (workoutId: string, change: number) => {
    const item = reviewItems.find((i) => i.session.workout.id === workoutId);
    if (!item) return;

    const currentWeight = item.session.weightUsed || item.session.workout.weight;
    const currentAdjustment = adjustments.get(workoutId) || 0;
    const newAdjustment = currentAdjustment + change;
    const newWeight = currentWeight + newAdjustment;

    // Prevent negative weights
    if (newWeight <= 0) return;

    setAdjustments(new Map(adjustments.set(workoutId, newAdjustment)));
  };

  const handleApplyAdjustment = async (workoutId: string) => {
    const item = reviewItems.find((i) => i.session.workout.id === workoutId);
    if (!item) return;

    const adjustment = adjustments.get(workoutId);
    if (!adjustment) return;

    const currentWeight = item.session.weightUsed || item.session.workout.weight;
    const newWeight = currentWeight + adjustment;

    setUpdatingWorkouts(new Set(updatingWorkouts.add(workoutId)));

    try {
      await onUpdateWorkout(workoutId, newWeight);
      // Clear adjustment after successful update
      const newAdjustments = new Map(adjustments);
      newAdjustments.delete(workoutId);
      setAdjustments(newAdjustments);
    } catch (error) {
      console.error("Failed to update workout:", error);
    } finally {
      const newUpdatingWorkouts = new Set(updatingWorkouts);
      newUpdatingWorkouts.delete(workoutId);
      setUpdatingWorkouts(newUpdatingWorkouts);
    }
  };

  const handleApplySuggestion = async (workoutId: string, suggestion: number) => {
    const item = reviewItems.find((i) => i.session.workout.id === workoutId);
    if (!item || !suggestion) return;

    const currentWeight = item.session.weightUsed || item.session.workout.weight;
    const newWeight = currentWeight + suggestion;

    setUpdatingWorkouts(new Set(updatingWorkouts.add(workoutId)));

    try {
      await onUpdateWorkout(workoutId, newWeight);
    } catch (error) {
      console.error("Failed to update workout:", error);
    } finally {
      const newUpdatingWorkouts = new Set(updatingWorkouts);
      newUpdatingWorkouts.delete(workoutId);
      setUpdatingWorkouts(newUpdatingWorkouts);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <CardTitle className="text-xl text-emerald-500">
              Workout Complete!
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Review your progress and adjust for next time
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviewItems.map((item) => {
          const { session, previousSession, progressType, progressAmount, suggestion } = item;
          const workout = session.workout;
          const currentWeight = session.weightUsed || workout.weight;
          const adjustment = adjustments.get(workout.id) || 0;
          const isUpdating = updatingWorkouts.has(workout.id);
          const unit = workout.workoutType === "time" ? "min" : "kg";

          return (
            <Card key={session.id} className="bg-background/50">
              <CardContent className="pt-6 space-y-4">
                {/* Workout name and progress indicator */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{workout.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {workout.workoutType === "time"
                        ? `${currentWeight} ${unit}`
                        : `${session.setsCompleted} × ${workout.repsPerSet} @ ${currentWeight}${unit}`
                      }
                    </p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    progressType === "improved" && "bg-emerald-500/20 text-emerald-500",
                    progressType === "maintained" && "bg-blue-500/20 text-blue-500",
                    progressType === "decreased" && "bg-orange-500/20 text-orange-500",
                    progressType === "first" && "bg-purple-500/20 text-purple-500"
                  )}>
                    {progressType === "improved" && (
                      <>
                        <TrendingUp className="h-3 w-3" />
                        +{Math.abs(progressAmount)}{unit}
                      </>
                    )}
                    {progressType === "maintained" && (
                      <>
                        <Minus className="h-3 w-3" />
                        Same
                      </>
                    )}
                    {progressType === "decreased" && (
                      <>
                        <TrendingDown className="h-3 w-3" />
                        -{Math.abs(progressAmount)}{unit}
                      </>
                    )}
                    {progressType === "first" && (
                      <>
                        <Trophy className="h-3 w-3" />
                        First time!
                      </>
                    )}
                  </div>
                </div>

                {/* Progress message */}
                <div className="text-sm text-muted-foreground">
                  {progressType === "improved" && (
                    <p>Great progress! You increased by {Math.abs(progressAmount)}{unit} from last time.</p>
                  )}
                  {progressType === "maintained" && previousSession && (
                    <p>Same as last time. Consider increasing the {workout.workoutType === "time" ? "duration" : "weight"} to keep progressing.</p>
                  )}
                  {progressType === "decreased" && (
                    <p>You used less {workout.workoutType === "time" ? "time" : "weight"} than last time. Build back up at this level.</p>
                  )}
                  {progressType === "first" && (
                    <p>Congratulations on completing this workout for the first time!</p>
                  )}
                </div>

                {/* Adjustment controls */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      Adjust for next time:
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdjustment(workout.id, workout.workoutType === "time" ? -5 : -2.5)}
                        disabled={isUpdating || (currentWeight + adjustment) <= (workout.workoutType === "time" ? 5 : 2.5)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="min-w-[100px] text-center">
                        <span className="text-lg font-semibold">
                          {(currentWeight + adjustment).toFixed(1)}{unit}
                        </span>
                        {adjustment !== 0 && (
                          <span className={cn(
                            "text-xs ml-1",
                            adjustment > 0 ? "text-emerald-500" : "text-orange-500"
                          )}>
                            ({adjustment > 0 ? "+" : ""}{adjustment.toFixed(1)})
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdjustment(workout.id, workout.workoutType === "time" ? 5 : 2.5)}
                        disabled={isUpdating}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Quick suggestion button */}
                  {suggestion > 0 && !adjustment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplySuggestion(workout.id, suggestion)}
                      disabled={isUpdating}
                      className="w-full"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Quick increase: +{suggestion}{unit}
                    </Button>
                  )}

                  {/* Apply button */}
                  {adjustment !== 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApplyAdjustment(workout.id)}
                      disabled={isUpdating}
                      className="w-full"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {isUpdating ? "Updating..." : "Apply Change"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Summary footer */}
        <div className="pt-2 text-center">
          <p className="text-sm text-muted-foreground">
            Changes will apply to your next scheduled workout
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
