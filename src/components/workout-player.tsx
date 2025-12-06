"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, SkipForward, Check, Sparkles, RotateCcw, Settings2, GripVertical, TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDuration } from "@/lib/utils";
import type { WorkoutSession } from "@/types";
import { WorkoutReview } from "@/components/workout-review";

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

// Action queue item for sequential processing
interface QueuedAction {
  type: 'complete-set' | 'complete-workout';
  sessionId: string;
}

export function WorkoutPlayer({
  sessions,
  onUpdateSession,
  onRegenerateTip,
  recentSessions = [],
  onReorderSessions,
}: WorkoutPlayerProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [draggedUpcomingIndex, setDraggedUpcomingIndex] = useState<number | null>(null);
  const [dragOverUpcomingIndex, setDragOverUpcomingIndex] = useState<number | null>(null);
  const [reviewingSessionId, setReviewingSessionId] = useState<string | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const touchElementRef = useRef<HTMLDivElement | null>(null);
  const [weightAdjustment, setWeightAdjustment] = useState(0);
  const [isUpdatingWeight, setIsUpdatingWeight] = useState(false);

  // Queue-based processing to prevent race conditions
  const actionQueueRef = useRef<QueuedAction[]>([]);
  const isProcessingRef = useRef(false);

  // Local optimistic state - single source of truth for current progress
  const localStateRef = useRef<Map<string, { setsCompleted: number; completed: boolean }>>(new Map());

  // Helper to get local or actual state
  const getSessionState = useCallback((sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;

    const localState = localStateRef.current.get(sessionId);
    if (localState) {
      return {
        ...session,
        setsCompleted: localState.setsCompleted,
        completed: localState.completed,
      };
    }
    return session;
  }, [sessions]);

  // Find first incomplete session on mount and when sessions change
  useEffect(() => {
    // Don't change current session while reviewing - let the review flow handle navigation
    if (reviewingSessionId) return;

    if (!currentSessionId || !sessions.find((s) => s.id === currentSessionId)) {
      // Find first incomplete using local state if available
      const firstIncomplete = sessions.find((s) => {
        const state = getSessionState(s.id);
        return state && !state.completed;
      });

      if (firstIncomplete) {
        setCurrentSessionId(firstIncomplete.id);
        const state = getSessionState(firstIncomplete.id);
        setCurrentSet((state?.setsCompleted || 0) + 1);
        setIsResting(false);
      } else {
        setCurrentSessionId(null);
      }
    }
  }, [sessions, currentSessionId, getSessionState, reviewingSessionId]);

  // Get current session using local optimistic state
  const currentSession = getSessionState(currentSessionId || '');
  const currentSessionIndex = sessions.findIndex((s) => s.id === currentSessionId);
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

  // Check progress and provide recommendations
  const checkProgress = useCallback((
    workoutId: string,
    currentWeight: number,
    workoutType: "weight" | "time",
    targetSets: number,
    targetReps: number,
    actualSetsCompleted: number
  ) => {
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
    const completedAllSets = actualSetsCompleted >= targetSets;

    if (workoutType === "weight") {
      // Weight-based workout logic
      if (currentWeight > lastWeight) {
        const increase = currentWeight - lastWeight;
        setProgressMessage(`💪 Great progress! +${increase.toFixed(1)}kg from last time!`);
      } else if (currentWeight === lastWeight && completedAllSets) {
        // Same weight, completed all sets - ready to progress
        const recommendedIncrease = currentWeight * 0.05; // 5% increase
        const suggestion = Math.max(2.5, Math.round(recommendedIncrease / 2.5) * 2.5); // Round to nearest 2.5kg
        setProgressMessage(`✨ All sets completed! Try +${suggestion}kg next time to keep progressing.`);
      } else if (currentWeight === lastWeight && !completedAllSets) {
        setProgressMessage("📊 Same weight. Focus on completing all sets before increasing.");
      } else {
        // Weight decreased
        setProgressMessage("💪 Good work! Build back up at this weight before progressing.");
      }
    } else {
      // Time-based workout logic
      if (currentWeight > lastWeight) {
        const increase = currentWeight - lastWeight;
        setProgressMessage(`🏃 Endurance improved! +${increase} min from last time!`);
      } else if (currentWeight === lastWeight) {
        const recommendedIncrease = Math.max(5, Math.round(currentWeight * 0.1)); // 10% or 5 min minimum
        setProgressMessage(`⏱️ Same duration. Try +${recommendedIncrease} min next time to build endurance!`);
      } else {
        setProgressMessage("💪 Consistency is key! Maintain this duration and build back up.");
      }
    }

    setTimeout(() => setProgressMessage(null), 7000);
  }, [recentSessions]);

  // Process the action queue sequentially
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || actionQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const action = actionQueueRef.current.shift()!;

    try {
      const session = getSessionState(action.sessionId);
      if (!session || session.completed) {
        isProcessingRef.current = false;
        processQueue(); // Process next item
        return;
      }

      const workout = session.workout;

      if (action.type === 'complete-set') {
        const newSetsCompleted = session.setsCompleted + 1;
        const newRepsPerSet = [...session.repsPerSet, workout.repsPerSet];
        const isWorkoutComplete = newSetsCompleted >= workout.sets;

        // Update local state immediately - this is our source of truth
        localStateRef.current.set(session.id, {
          setsCompleted: newSetsCompleted,
          completed: isWorkoutComplete,
        });

        // Update UI state
        setCurrentSet(newSetsCompleted + 1);

        // Check progress when workout is complete
        if (isWorkoutComplete) {
          const currentWeight = session.weightUsed || workout.weight;
          checkProgress(
            workout.id,
            currentWeight,
            workout.workoutType,
            workout.sets,
            workout.repsPerSet,
            newSetsCompleted
          );

          // Show review screen instead of immediately moving to next workout
          setReviewingSessionId(session.id);
        } else {
          // Start rest timer for weight-based workouts
          if (workout.workoutType !== "time") {
            setRestTimeLeft(workout.restTime);
            setIsResting(true);
            setIsTimerActive(true);
          }
        }

        // Persist to backend (fire and forget - local state is source of truth)
        onUpdateSession(session.id, {
          setsCompleted: newSetsCompleted,
          repsPerSet: newRepsPerSet,
          completed: isWorkoutComplete,
        }).catch((error) => {
          console.error("Failed to update session:", error);
          // On error, could revert local state here
        });

      } else if (action.type === 'complete-workout') {
        // Update local state
        localStateRef.current.set(session.id, {
          setsCompleted: 1,
          completed: true,
        });

        // Check progress
        const currentDuration = session.duration || workout.weight;
        checkProgress(
          workout.id,
          currentDuration,
          workout.workoutType,
          1,
          1,
          1
        );

        // Show review screen instead of immediately moving to next workout
        setReviewingSessionId(session.id);

        // Persist to backend
        onUpdateSession(session.id, {
          setsCompleted: 1,
          repsPerSet: [1],
          completed: true,
        }).catch((error) => {
          console.error("Failed to update session:", error);
        });
      }
    } finally {
      isProcessingRef.current = false;
      // Process next item in queue
      if (actionQueueRef.current.length > 0) {
        processQueue();
      }
    }
  }, [sessions, onUpdateSession, checkProgress, getSessionState]);

  const completeSet = useCallback(() => {
    if (!currentSession || !workout) return;

    // Queue the action
    actionQueueRef.current.push({
      type: 'complete-set',
      sessionId: currentSession.id,
    });

    // Start processing
    processQueue();
  }, [currentSession, workout, processQueue]);

  const completeWorkout = useCallback(() => {
    if (!currentSession) return;

    // Queue the action
    actionQueueRef.current.push({
      type: 'complete-workout',
      sessionId: currentSession.id,
    });

    // Start processing
    processQueue();
  }, [currentSession, processQueue]);

  const skipRest = () => {
    setIsResting(false);
    setIsTimerActive(false);
    setRestTimeLeft(0);
  };

  const toggleTimer = () => {
    setIsTimerActive((prev) => !prev);
  };

  const handleUpcomingDragStart = (e: React.DragEvent, index: number) => {
    setDraggedUpcomingIndex(index);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleUpcomingDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedUpcomingIndex(null);
    setDragOverUpcomingIndex(null);
  };

  const handleUpcomingDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverUpcomingIndex(index);
  };

  const handleUpcomingDragLeave = () => {
    setDragOverUpcomingIndex(null);
  };

  const handleUpcomingDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!onReorderSessions || draggedUpcomingIndex === null || draggedUpcomingIndex === dropIndex) {
      setDraggedUpcomingIndex(null);
      setDragOverUpcomingIndex(null);
      return;
    }

    // Convert upcoming indices to absolute session indices
    const dragAbsoluteIndex = currentSessionIndex + 1 + draggedUpcomingIndex;
    const dropAbsoluteIndex = currentSessionIndex + 1 + dropIndex;

    // Create new sessions array with reordered items
    const newSessions = [...sessions];
    const [draggedSession] = newSessions.splice(dragAbsoluteIndex, 1);
    newSessions.splice(dropAbsoluteIndex, 0, draggedSession);

    setDraggedUpcomingIndex(null);
    setDragOverUpcomingIndex(null);

    // Update immediately (optimistic)
    await onReorderSessions(newSessions.map((s) => s.id));
  };

  // Touch event handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!reorderMode) return;
    setDraggedUpcomingIndex(index);
    setTouchStartY(e.touches[0].clientY);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "0.5";
    touchElementRef.current = target as HTMLDivElement;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!reorderMode || draggedUpcomingIndex === null || touchStartY === null) return;

    e.preventDefault(); // Prevent scrolling while dragging

    const touch = e.touches[0];
    const touchY = touch.clientY;
    const touchX = touch.clientX;

    // Find the element at the touch position
    const elementAtPoint = document.elementFromPoint(touchX, touchY);
    if (!elementAtPoint) return;

    // Find the closest workout item ancestor
    const workoutItem = elementAtPoint.closest('[data-workout-item]') as HTMLElement;
    if (!workoutItem) return;

    // Get the index from the data attribute
    const index = parseInt(workoutItem.dataset.workoutIndex || '-1', 10);
    if (index >= 0 && index !== draggedUpcomingIndex) {
      setDragOverUpcomingIndex(index);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent, upcomingWorkoutsLength: number) => {
    if (!reorderMode || draggedUpcomingIndex === null) return;

    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "1";

    // Perform the reorder if we have a valid drop target
    if (dragOverUpcomingIndex !== null && dragOverUpcomingIndex !== draggedUpcomingIndex && onReorderSessions) {
      const dragAbsoluteIndex = currentSessionIndex + 1 + draggedUpcomingIndex;
      const dropAbsoluteIndex = currentSessionIndex + 1 + dragOverUpcomingIndex;

      const newSessions = [...sessions];
      const [draggedSession] = newSessions.splice(dragAbsoluteIndex, 1);
      newSessions.splice(dropAbsoluteIndex, 0, draggedSession);

      await onReorderSessions(newSessions.map((s) => s.id));
    }

    // Reset state
    setDraggedUpcomingIndex(null);
    setDragOverUpcomingIndex(null);
    setTouchStartY(null);
    touchElementRef.current = null;
  };

  const handleUpdateWorkout = async (workoutId: string, newWeight: number) => {
    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ weight: newWeight }),
      });

      if (!response.ok) {
        throw new Error("Failed to update workout");
      }

      // Show success message
      setProgressMessage("✨ Workout updated successfully!");
      setTimeout(() => setProgressMessage(null), 3000);
    } catch (error) {
      console.error("Failed to update workout:", error);
      setProgressMessage("❌ Failed to update workout. Please try again.");
      setTimeout(() => setProgressMessage(null), 3000);
      throw error;
    }
  };

  const handleAdjustWeight = (change: number, currentWeight: number, workoutType: string) => {
    const newAdjustment = weightAdjustment + change;
    const newWeight = currentWeight + newAdjustment;

    // Prevent negative weights
    if (newWeight <= 0) return;

    setWeightAdjustment(newAdjustment);
  };

  const handleApplyWeightAdjustment = async (workoutId: string, currentWeight: number) => {
    if (weightAdjustment === 0) return;

    const newWeight = currentWeight + weightAdjustment;
    setIsUpdatingWeight(true);

    try {
      await handleUpdateWorkout(workoutId, newWeight);
      setWeightAdjustment(0);
    } catch (error) {
      console.error("Failed to update workout:", error);
    } finally {
      setIsUpdatingWeight(false);
    }
  };

  const handleContinueFromReview = useCallback(() => {
    if (!reviewingSessionId) return;

    // Clear review state
    setReviewingSessionId(null);
    setWeightAdjustment(0);

    // Find next incomplete workout
    const currentIndex = sessions.findIndex((s) => s.id === reviewingSessionId);
    const nextIncomplete = sessions
      .slice(currentIndex + 1)
      .find((s) => {
        const state = getSessionState(s.id);
        return state && !state.completed;
      });

    if (nextIncomplete) {
      setCurrentSessionId(nextIncomplete.id);
      const nextState = getSessionState(nextIncomplete.id);
      setCurrentSet((nextState?.setsCompleted || 0) + 1);
      setIsResting(false);
    } else {
      setCurrentSessionId(null);
    }
  }, [reviewingSessionId, sessions, getSessionState]);

  // If we're reviewing a specific workout, show the individual review screen
  if (reviewingSessionId) {
    const reviewSession = getSessionState(reviewingSessionId);
    if (reviewSession) {
      const reviewWorkout = reviewSession.workout;
      const currentWeight = reviewSession.weightUsed || reviewWorkout.weight;
      const unit = reviewWorkout.workoutType === "time" ? "min" : "kg";

      // Find previous session for comparison
      const previousSessions = recentSessions
        .filter((s) => s.workoutId === reviewWorkout.id && s.completed && s.id !== reviewSession.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const previousSession = previousSessions[0] || null;

      let progressType: "improved" | "maintained" | "decreased" | "first" = "first";
      let progressAmount = 0;

      if (previousSession) {
        const previousWeight = previousSession.weightUsed || previousSession.workout.weight;
        progressAmount = currentWeight - previousWeight;

        if (progressAmount > 0) {
          progressType = "improved";
        } else if (progressAmount === 0) {
          progressType = "maintained";
        } else {
          progressType = "decreased";
        }
      }

      // Check if there are more workouts remaining
      const currentIndex = sessions.findIndex((s) => s.id === reviewingSessionId);
      const remainingWorkouts = sessions
        .slice(currentIndex + 1)
        .filter((s) => {
          const state = getSessionState(s.id);
          return state && !state.completed;
        });
      const hasMoreWorkouts = remainingWorkouts.length > 0;

      return (
        <div className="space-y-4">
          {/* Progress message */}
          {progressMessage && (
            <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-sm font-medium text-center">{progressMessage}</p>
            </div>
          )}

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl text-emerald-500">
                    Workout Complete!
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reviewWorkout.name}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Workout summary */}
              <div className="bg-background/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {reviewWorkout.workoutType === "time" ? "Duration" : "Weight Used"}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {currentWeight}{unit}
                  </span>
                </div>

                {reviewWorkout.workoutType !== "time" && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sets Completed</span>
                    <span className="text-lg font-semibold">
                      {reviewSession.setsCompleted} × {reviewWorkout.repsPerSet} reps
                    </span>
                  </div>
                )}

                {/* Progress indicator */}
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg",
                  progressType === "improved" && "bg-emerald-500/20",
                  progressType === "maintained" && "bg-blue-500/20",
                  progressType === "decreased" && "bg-orange-500/20",
                  progressType === "first" && "bg-purple-500/20"
                )}>
                  {progressType === "improved" && (
                    <>
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-500">
                        +{Math.abs(progressAmount)}{unit} from last time!
                      </span>
                    </>
                  )}
                  {progressType === "maintained" && (
                    <>
                      <Minus className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium text-blue-500">
                        Same as last time
                      </span>
                    </>
                  )}
                  {progressType === "decreased" && (
                    <>
                      <TrendingDown className="h-5 w-5 text-orange-500" />
                      <span className="text-sm font-medium text-orange-500">
                        -{Math.abs(progressAmount)}{unit} from last time
                      </span>
                    </>
                  )}
                  {progressType === "first" && (
                    <>
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <span className="text-sm font-medium text-purple-500">
                        First time completing this workout!
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Weight/Time Adjustment Controls */}
              <div className="bg-background/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Adjust for next time:
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAdjustWeight(
                        reviewWorkout.workoutType === "time" ? -5 : -2.5,
                        currentWeight,
                        reviewWorkout.workoutType
                      )}
                      disabled={isUpdatingWeight || (currentWeight + weightAdjustment) <= (reviewWorkout.workoutType === "time" ? 5 : 2.5)}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="min-w-[100px] text-center">
                      <span className="text-lg font-semibold">
                        {(currentWeight + weightAdjustment).toFixed(1)}{unit}
                      </span>
                      {weightAdjustment !== 0 && (
                        <span className={cn(
                          "text-xs ml-1",
                          weightAdjustment > 0 ? "text-emerald-500" : "text-orange-500"
                        )}>
                          ({weightAdjustment > 0 ? "+" : ""}{weightAdjustment.toFixed(1)})
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAdjustWeight(
                        reviewWorkout.workoutType === "time" ? 5 : 2.5,
                        currentWeight,
                        reviewWorkout.workoutType
                      )}
                      disabled={isUpdatingWeight}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Quick suggestion for maintained/improved progress */}
                {weightAdjustment === 0 && (progressType === "maintained" || progressType === "improved") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const suggestion = reviewWorkout.workoutType === "time"
                        ? Math.max(5, Math.round(currentWeight * 0.1))
                        : Math.max(2.5, Math.round((currentWeight * 0.05) / 2.5) * 2.5);
                      setWeightAdjustment(suggestion);
                    }}
                    disabled={isUpdatingWeight}
                    className="w-full"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {progressType === "maintained" ? "Increase for progress" : "Continue improving"}
                    {" (+"}
                    {reviewWorkout.workoutType === "time"
                      ? Math.max(5, Math.round(currentWeight * 0.1))
                      : Math.max(2.5, Math.round((currentWeight * 0.05) / 2.5) * 2.5)
                    }
                    {unit})
                  </Button>
                )}

                {/* Apply adjustment button */}
                {weightAdjustment !== 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleApplyWeightAdjustment(reviewWorkout.id, currentWeight)}
                    disabled={isUpdatingWeight}
                    className="w-full"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {isUpdatingWeight ? "Updating..." : "Apply Change"}
                  </Button>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  {reviewWorkout.workoutType === "time"
                    ? "Adjust duration in 5 minute increments"
                    : "Adjust weight in 2.5kg increments"
                  }
                </p>
              </div>

              {/* Continue button */}
              <Button
                onClick={handleContinueFromReview}
                size="lg"
                className="w-full h-14 text-lg"
              >
                {hasMoreWorkouts ? (
                  <>
                    <SkipForward className="h-5 w-5 mr-2" />
                    Continue to Next Workout
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Finish Session
                  </>
                )}
              </Button>

              {/* Show remaining workouts */}
              {hasMoreWorkouts && (
                <div className="text-center text-sm text-muted-foreground">
                  {remainingWorkouts.length} workout{remainingWorkouts.length > 1 ? "s" : ""} remaining
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  if (!currentSession || !workout) {
    // Get all completed sessions from today
    const completedSessions = sessions.filter((s) => {
      const state = getSessionState(s.id);
      return state?.completed;
    });

    return (
      <div className="space-y-4">
        {/* Progress message */}
        {progressMessage && (
          <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm font-medium text-center">{progressMessage}</p>
          </div>
        )}

        <WorkoutReview
          completedSessions={completedSessions}
          recentSessions={recentSessions}
          onUpdateWorkout={handleUpdateWorkout}
        />
      </div>
    );
  }

  // Calculate overall progress based on completed sessions + current progress
  // Use local state for accurate counts
  const completedCount = sessions.filter((s) => {
    const state = getSessionState(s.id);
    return state?.completed;
  }).length;
  const currentProgress = currentSession && workout
    ? (currentSession.setsCompleted / workout.sets)
    : 0;
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
          ) : (
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
      {(() => {
        const upcomingWorkouts = sessions
          .slice(currentSessionIndex + 1)
          .filter((s) => {
            const state = getSessionState(s.id);
            return state && !state.completed;
          });

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
            {reorderMode && upcomingWorkouts.length > 1 && (
              <p className="text-xs text-muted-foreground text-center">
                Tap and drag to reorder workouts
              </p>
            )}
            <div className="space-y-2">
              {upcomingWorkouts.map((session, index) => (
                <div
                  key={session.id}
                  data-workout-item
                  data-workout-index={index}
                  draggable={reorderMode}
                  onDragStart={(e) => reorderMode && handleUpcomingDragStart(e, index)}
                  onDragEnd={handleUpcomingDragEnd}
                  onDragOver={(e) => reorderMode && handleUpcomingDragOver(e, index)}
                  onDragLeave={handleUpcomingDragLeave}
                  onDrop={(e) => reorderMode && handleUpcomingDrop(e, index)}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={(e) => handleTouchEnd(e, upcomingWorkouts.length)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                    reorderMode ? [
                      draggedUpcomingIndex === index && "opacity-40",
                      dragOverUpcomingIndex === index && draggedUpcomingIndex !== index && "border-2 border-primary border-dashed",
                      draggedUpcomingIndex !== index && "bg-muted/50 cursor-grab active:cursor-grabbing hover:bg-muted hover:shadow-sm"
                    ] : "bg-muted/50"
                  )}
                  style={{ touchAction: reorderMode ? 'none' : 'auto' }}
                >
                  {reorderMode && (
                    <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-medium flex-1">{session.workout.name}</span>
                  <span className="text-muted-foreground text-sm shrink-0">
                    {session.workout.workoutType === "time"
                      ? `${session.workout.weight} min`
                      : `${session.workout.sets} x ${session.workout.repsPerSet} @ ${session.workout.weight}kg`
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
