"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipForward, Check, Sparkles, RotateCcw } from "lucide-react";
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
}

export function WorkoutPlayer({
  sessions,
  onUpdateSession,
  onRegenerateTip,
}: WorkoutPlayerProps) {
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const currentSession = sessions[currentSessionIndex];
  const workout = currentSession?.workout;

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

  const completeSet = useCallback(async () => {
    if (!currentSession || !workout) return;

    const newSetsCompleted = currentSession.setsCompleted + 1;
    const newRepsPerSet = [...currentSession.repsPerSet, workout.repsPerSet];
    const isWorkoutComplete = newSetsCompleted >= workout.sets;

    await onUpdateSession(currentSession.id, {
      setsCompleted: newSetsCompleted,
      repsPerSet: newRepsPerSet,
      completed: isWorkoutComplete,
    });

    if (isWorkoutComplete) {
      // Move to next workout
      if (currentSessionIndex < sessions.length - 1) {
        setCurrentSessionIndex((prev) => prev + 1);
        setCurrentSet(1);
      }
    } else {
      // Start rest timer
      setCurrentSet((prev) => prev + 1);
      setRestTimeLeft(workout.restTime);
      setIsResting(true);
      setIsTimerActive(true);
    }
  }, [currentSession, workout, currentSessionIndex, sessions.length, onUpdateSession]);

  const skipRest = () => {
    setIsResting(false);
    setIsTimerActive(false);
    setRestTimeLeft(0);
  };

  const toggleTimer = () => {
    setIsTimerActive((prev) => !prev);
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

  const progress = (currentSession.setsCompleted / workout.sets) * 100;
  const overallProgress =
    ((currentSessionIndex + progress / 100) / sessions.length) * 100;

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-medium">
            {currentSessionIndex + 1} / {sessions.length} workouts
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
              {workout.weight} kg
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Set progress */}
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

          {/* Rest timer or action button */}
          {isResting ? (
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
          )}

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
      {sessions.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Up Next
          </h4>
          <div className="space-y-2">
            {sessions.slice(currentSessionIndex + 1, currentSessionIndex + 3).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
              >
                <span className="font-medium">{session.workout.name}</span>
                <span className="text-muted-foreground text-sm">
                  {session.workout.sets} x {session.workout.repsPerSet} @{" "}
                  {session.workout.weight}kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
