"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipForward, Check, Sparkles, RotateCcw, ChevronUp, ChevronDown, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDuration } from "@/lib/utils";
import type { WorkoutSession } from "@/types";

interface WorkoutPlayerProps {
  sessions: WorkoutSession[];
  onUpdateSession: (
    sessionId: string,
    data: { setsCompleted?: number; repsPerSet?: number[]; completed?: boolean }
  ) => Promise<void>;
  onRegenerateTip: (workoutId: string) => Promise<void>;
  recentSessions?: WorkoutSession[];
  onReorderSessions?: (sessionIds: string[]) => Promise<void>;
}

export function WorkoutPlayer({
  sessions,
  onUpdateSession,
  onRegenerateTip,
  recentSessions = [],
  onReorderSessions,
}: WorkoutPlayerProps) {
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  // Find first incomplete session on mount
  useEffect(() => {
    const firstIncompleteIndex = sessions.findIndex((s) => !s.completed);
    if (firstIncompleteIndex !== -1) {
      setCurrentSessionIndex(firstIncompleteIndex);
    }
  }, [sessions]);

  const currentSession = sessions[currentSessionIndex];
  const workout = currentSession?.workout;

  // Skip to next incomplete session if current is completed
  useEffect(() => {
    if (currentSession?.completed) {
      const nextIncompleteIndex = sessions.findIndex(
        (s, idx) => idx > currentSessionIndex && !s.completed
      );
      if (nextIncompleteIndex !== -1) {
        setCurrentSessionIndex(nextIncompleteIndex);
        setCurrentSet(1);
        setIsResting(false);
      }
    }
  }, [currentSession?.completed, currentSessionIndex, sessions]);

  // Rest timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && isTimerActive && restTimeLeft > 0) {
      interval = setInterval(() => {
        setRestTimeLeft((prev) => {
          if (prev <= 1) {
            setIsResting(false);
            setIsTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, isTimerActive, restTimeLeft]);

  // Check progress against recent sessions
  const checkProgress = useCallback((workoutId: string, currentWeight: number) => {
    const previousSessions = recentSessions
      .filter((s) => s.workoutId === workoutId && s.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (previousSessions.length === 0) {
      setProgressMessage("🎉 First time completing this workout! Great job!");
      setTimeout(() => setProgressMessage(null), 5000);
      return;
    }

    const lastSession = previousSessions[0];
    const lastWeight = lastSession.weightUsed || lastSession.workout.weight;

    if (currentWeight > lastWeight) {
      const increase = currentWeight - lastWeight;
      setProgressMessage(`💪 Progress! +${increase.toFixed(1)}kg from last time!`);
    } else if (currentWeight === lastWeight) {
      setProgressMessage("✨ Same weight as last time. Consider increasing next session!");
    } else {
      setProgressMessage("📊 Tracking your progress...");
    }

    setTimeout(() => setProgressMessage(null), 5000);
  }, [recentSessions]);

  const completeSet = useCallback(async () => {
    if (!currentSession || !workout || isCompleting) return;

    setIsCompleting(true);

    const newSetsCompleted = currentSession.setsCompleted + 1;
    const newRepsPerSet = [...currentSession.repsPerSet, workout.repsPerSet];
    const isWorkoutComplete = newSetsCompleted >= workout.sets;

    // Check progress when workout is complete
    if (isWorkoutComplete) {
      const currentWeight = currentSession.weightUsed || workout.weight;
      checkProgress(workout.id, currentWeight);
    }

    // Immediately update UI before API call for instant feedback
    if (isWorkoutComplete) {
      // Move to next incomplete workout
      const nextIncompleteIndex = sessions.findIndex(
        (s, idx) => idx > currentSessionIndex && !s.completed
      );
      if (nextIncompleteIndex !== -1) {
        setCurrentSessionIndex(nextIncompleteIndex);
        setCurrentSet(1);
        setIsResting(false);
      }
    } else {
      // Start rest timer immediately (only for weight-based workouts)
      if (workout.workoutType !== "time") {
        setCurrentSet((prev) => prev + 1);
        setRestTimeLeft(workout.restTime);
        setIsResting(true);
        setIsTimerActive(true);
      }
    }

    // Update API in background
    try {
      await onUpdateSession(currentSession.id, {
        setsCompleted: newSetsCompleted,
        repsPerSet: newRepsPerSet,
        completed: isWorkoutComplete,
      });
    } finally {
      setIsCompleting(false);
    }
  }, [currentSession, workout, currentSessionIndex, sessions, onUpdateSession, isCompleting, checkProgress]);

  const completeWorkout = useCallback(async () => {
    if (!currentSession || isCompleting) return;

    const workout = currentSession.workout;
    setIsCompleting(true);

    // Check progress for time-based workouts
    const currentDuration = currentSession.duration || workout.weight;
    checkProgress(workout.id, currentDuration);

    // Immediately update UI before API call for instant feedback
    const nextIncompleteIndex = sessions.findIndex(
      (s, idx) => idx > currentSessionIndex && !s.completed
    );
    if (nextIncompleteIndex !== -1) {
      setCurrentSessionIndex(nextIncompleteIndex);
      setCurrentSet(1);
    }

    // Update API in background
    try {
      await onUpdateSession(currentSession.id, {
        setsCompleted: 1,
        repsPerSet: [1],
        completed: true,
      });
    } finally {
      setIsCompleting(false);
    }
  }, [currentSession, currentSessionIndex, sessions, onUpdateSession, isCompleting, checkProgress]);

  const skipRest = () => {
    setIsResting(false);
    setIsTimerActive(false);
    setRestTimeLeft(0);
  };

  const toggleTimer = () => {
    setIsTimerActive((prev) => !prev);
  };

  const moveUpcomingWorkout = async (upcomingIndex: number, direction: "up" | "down") => {
    if (!onReorderSessions) return;

    // upcomingIndex is relative to upcoming workouts list
    // Convert to absolute session index
    const absoluteIndex = currentSessionIndex + 1 + upcomingIndex;
    const targetIndex = direction === "up" ? absoluteIndex - 1 : absoluteIndex + 1;

    // Can't move before current workout or beyond end
    if (targetIndex <= currentSessionIndex || targetIndex >= sessions.length) return;

    const newSessions = [...sessions];
    [newSessions[absoluteIndex], newSessions[targetIndex]] =
      [newSessions[targetIndex], newSessions[absoluteIndex]];

    await onReorderSessions(newSessions.map((s) => s.id));
  };

  if (!currentSession || !workout) {
    return (
      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-emerald-500">
            All Done for Today!
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Great job completing your workouts
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall progress based on completed sessions + current progress
  const completedCount = sessions.filter((s) => s.completed).length;
  const currentProgress = currentSession ? (currentSession.setsCompleted / workout.sets) : 0;
  const overallProgress = sessions.length > 0
    ? ((completedCount + currentProgress) / sessions.length) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Progress message */}
      {progressMessage && (
        <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm font-medium text-center">{progressMessage}</p>
        </div>
      )}

      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-medium">
            {completedCount} / {sessions.length} workouts
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Current workout card */}
      <Card
        className={cn(
          "transition-all duration-300",
          isResting
            ? "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20"
            : "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{workout.name}</CardTitle>
            <span className="text-2xl font-bold text-primary">
              {workout.weight} {workout.workoutType === "time" ? "min" : "kg"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Set progress - only for weight-based workouts */}
          {workout.workoutType !== "time" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Set {Math.min(currentSet, workout.sets)} of {workout.sets}
                </span>
                <span>{workout.repsPerSet} reps</span>
              </div>
              <div className="flex gap-2">
                {Array.from({ length: workout.sets }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 h-3 rounded-full transition-all",
                      i < currentSession.setsCompleted
                        ? "bg-emerald-500"
                        : i === currentSession.setsCompleted
                        ? "bg-primary animate-pulse"
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Rest timer or action button */}
          {isResting && workout.workoutType !== "time" ? (
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold tabular-nums">
                {formatDuration(restTimeLeft)}
              </div>
              <p className="text-muted-foreground">Rest Time</p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTimer}
                  className="h-12 w-12"
                >
                  {isTimerActive ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={skipRest}
                  className="h-12 px-6"
                >
                  <SkipForward className="h-5 w-5 mr-2" />
                  Skip
                </Button>
              </div>
            </div>
          ) : !isCompleting ? (
            workout.workoutType === "time" ? (
              <Button
                onClick={completeWorkout}
                size="lg"
                variant="success"
                className="w-full h-14 text-lg"
              >
                <Check className="h-5 w-5 mr-2" />
                Complete Workout
              </Button>
            ) : (
              <Button
                onClick={completeSet}
                size="lg"
                variant="success"
                className="w-full h-14 text-lg"
              >
                <Check className="h-5 w-5 mr-2" />
                Complete Set {currentSet}
              </Button>
            )
          ) : null}

          {/* AI Tip */}
          {workout.aiTip && (
            <div className="bg-background/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  AI Tip
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRegenerateTip(workout.id)}
                  className="h-7 px-2"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{workout.aiTip}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming workouts */}
      {(() => {
        const upcomingWorkouts = sessions
          .slice(currentSessionIndex + 1)
          .filter((s) => !s.completed);

        return upcomingWorkouts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">
                Up Next
              </h4>
              {onReorderSessions && upcomingWorkouts.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReorderMode(!reorderMode)}
                  className="h-7 text-xs"
                >
                  <Settings2 className="h-3 w-3 mr-1" />
                  {reorderMode ? "Done" : "Reorder"}
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {upcomingWorkouts.map((session, index) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                >
                  <span className="font-medium flex-1">{session.workout.name}</span>
                  {reorderMode ? (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveUpcomingWorkout(index, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveUpcomingWorkout(index, "down")}
                        disabled={index === upcomingWorkouts.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm shrink-0">
                      {session.workout.workoutType === "time"
                        ? `${session.workout.weight} min`
                        : `${session.workout.sets} x ${session.workout.repsPerSet} @ ${session.workout.weight}kg`
                      }
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
