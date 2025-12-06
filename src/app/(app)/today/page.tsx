"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Loader2, Plus, GripVertical, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkoutPlayer } from "@/components/workout-player";
import { isWorkoutScheduledForDate, getCycleWorkoutForDate } from "@/lib/utils";
import type { Workout, WorkoutSession, WorkoutCycle } from "@/types";

export default function TodayPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [cycles, setCycles] = useState<WorkoutCycle[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingCustom, setCreatingCustom] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [localWorkoutOrder, setLocalWorkoutOrder] = useState<string[]>([]);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const today = new Date();

  const fetchData = useCallback(async () => {
    try {
      // Single API call instead of 5 separate calls
      const res = await fetch("/api/today");
      const data = await res.json();

      setWorkouts(data.workouts);
      setCycles(data.cycles);
      setSessions(data.todaySessions);
      setRecentSessions(data.recentSessions || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get scheduled workouts (includes both standalone and cycle workouts)
  const getAvailableWorkouts = (): Workout[] => {
    const result: Workout[] = [];

    // Get standalone workouts (not in a cycle)
    const standaloneWorkouts = workouts.filter((w) => !w.cycleId);

    // Show all scheduled standalone workouts for today
    for (const workout of standaloneWorkouts) {
      if (isWorkoutScheduledForDate(workout, today)) {
        result.push(workout);
      }
    }

    // Get workouts from cycles scheduled for today
    for (const cycle of cycles) {
      const cycleWorkout = getCycleWorkoutForDate(cycle, today);
      if (cycleWorkout) {
        // Find the full workout data
        const fullWorkout = workouts.find((w) => w.id === cycleWorkout.id);
        if (fullWorkout) {
          result.push(fullWorkout);
        }
      }
    }

    return result;
  };

  const scheduledWorkouts = getAvailableWorkouts();

  // Initialize local workout order when scheduled workouts change
  useEffect(() => {
    if (scheduledWorkouts.length > 0 && localWorkoutOrder.length === 0) {
      setLocalWorkoutOrder(scheduledWorkouts.map(w => w.id));
    }
  }, [scheduledWorkouts, localWorkoutOrder.length]);

  // Get ordered workouts based on local state or default order
  const orderedWorkouts = localWorkoutOrder.length > 0
    ? localWorkoutOrder
        .map(id => scheduledWorkouts.find(w => w.id === id))
        .filter((w): w is typeof scheduledWorkouts[0] => w !== undefined)
    : scheduledWorkouts;

  const createSessionsForToday = async () => {
    setCreating(true);
    try {
      const workoutsWithoutSessions = scheduledWorkouts.filter(
        (workout) => !sessions.some((s) => s.workoutId === workout.id)
      );

      for (const workout of workoutsWithoutSessions) {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workoutId: workout.id }),
        });
      }

      await fetchData();
    } catch (error) {
      console.error("Failed to create sessions:", error);
    } finally {
      setCreating(false);
    }
  };

  const createCustomSession = async (workoutId: string) => {
    setCreatingCustom(true);
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutId }),
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to create session:", error);
    } finally {
      setCreatingCustom(false);
    }
  };

  const createSessionsFromDay = async (date: string) => {
    setCreatingCustom(true);
    try {
      const sessionsForDay = recentSessions.filter((s) => {
        const sessionDate = new Date(s.date);
        return format(sessionDate, "yyyy-MM-dd") === date;
      });

      // Get unique workout IDs (in case there are duplicates on that day)
      const uniqueWorkoutIds = [...new Set(sessionsForDay.map(s => s.workoutId))];

      // Only create sessions for workouts that don't already have a session today
      const workoutsToCreate = uniqueWorkoutIds.filter(
        workoutId => !sessions.some(s => s.workoutId === workoutId)
      );

      for (const workoutId of workoutsToCreate) {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workoutId }),
        });
      }

      await fetchData();
    } catch (error) {
      console.error("Failed to create sessions:", error);
    } finally {
      setCreatingCustom(false);
    }
  };

  // Group sessions by date (only completed sessions, already filtered in API)
  const sessionsByDate = recentSessions.reduce((acc, session) => {
    const dateKey = format(new Date(session.date), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, WorkoutSession[]>);

  // Sort dates in descending order (most recent first) - show all available days
  const sortedDates = Object.keys(sessionsByDate)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const updateSession = async (
    sessionId: string,
    data: { setsCompleted?: number; repsPerSet?: number[]; completed?: boolean }
  ) => {
    // Optimistic update - update local state immediately for instant feedback
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, ...data } : s
      )
    );

    // Only refetch if workout is completed (to get fresh data for next session)
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    // Only refetch if completing a workout - otherwise optimistic update is enough
    if (data.completed) {
      fetchData();
    }
  };

  const regenerateTip = async (workoutId: string) => {
    await fetch(`/api/workouts/${workoutId}/regenerate-tip`, {
      method: "POST",
    });
    fetchData();
  };

  const reorderSessions = async (sessionIds: string[]) => {
    // Optimistically update local state with new order AND displayOrder values
    const reorderedSessions = sessionIds
      .map((id) => sessions.find((s) => s.id === id))
      .filter((s): s is WorkoutSession => s !== undefined)
      .map((session, index) => ({
        ...session,
        workout: {
          ...session.workout,
          displayOrder: index,
        },
      }));
    setSessions(reorderedSessions);

    // Persist order to database by updating workout displayOrder
    const workoutIds = reorderedSessions.map((s) => s.workoutId);
    try {
      await fetch("/api/workouts/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutIds }),
      });
    } catch (error) {
      console.error("Failed to save session order:", error);
      // Revert on error
      fetchData();
    }
  };


  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Optimistic update - reorder immediately
    const newOrder = [...localWorkoutOrder];
    const [draggedId] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedId);
    setLocalWorkoutOrder(newOrder);

    setDraggedIndex(null);
    setDragOverIndex(null);

    // Save to server in background
    try {
      await fetch("/api/workouts/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutIds: newOrder }),
      });
    } catch (error) {
      console.error("Failed to save workout order:", error);
      // Revert on error
      fetchData();
    }
  };

  // Touch event handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    setDraggedIndex(index);
    setTouchStartY(e.touches[0].clientY);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "0.5";
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null || touchStartY === null) return;

    e.preventDefault(); // Prevent scrolling while dragging

    const touch = e.touches[0];
    const touchY = touch.clientY;
    const touchX = touch.clientX;

    // Find the element at the touch position
    const elementAtPoint = document.elementFromPoint(touchX, touchY);
    if (!elementAtPoint) return;

    // Find the closest workout item ancestor
    const workoutItem = elementAtPoint.closest('[data-initial-workout-item]') as HTMLElement;
    if (!workoutItem) return;

    // Get the index from the data attribute
    const index = parseInt(workoutItem.dataset.initialWorkoutIndex || '-1', 10);
    if (index >= 0 && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "1";

    // Perform the reorder if we have a valid drop target
    if (dragOverIndex !== null && dragOverIndex !== draggedIndex && draggedIndex !== null) {
      const newOrder = [...localWorkoutOrder];
      const [draggedId] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(dragOverIndex, 0, draggedId);
      setLocalWorkoutOrder(newOrder);

      // Save to server in background
      try {
        await fetch("/api/workouts/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workoutIds: newOrder }),
        });
      } catch (error) {
        console.error("Failed to save workout order:", error);
        // Revert on error
        fetchData();
      }
    }

    // Reset state
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTouchStartY(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasAllSessions = scheduledWorkouts.every((workout) =>
    sessions.some((s) => s.workoutId === workout.id)
  );

  const hasIncompleteSession = sessions.some((s) => !s.completed);
  const allSessionsComplete = sessions.length > 0 && sessions.every((s) => s.completed);

  // Sort sessions by workout displayOrder to maintain reordering in WorkoutPlayer
  const orderedSessions = [...sessions].sort((a, b) =>
    (a.workout.displayOrder || 0) - (b.workout.displayOrder || 0)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today&apos;s Workout</h1>
        <p className="text-muted-foreground">{format(today, "EEEE, MMMM d")}</p>
      </div>

      {scheduledWorkouts.length === 0 ? (
        <div className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No workouts scheduled for today</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Select a day below to play those workouts today
            </p>
          </div>

          {sortedDates.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Past Workout Days
              </p>
              {sortedDates.map((date) => {
                const daySessions = sessionsByDate[date];
                return (
                <Card key={date} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <button
                      onClick={() => createSessionsFromDay(date)}
                      disabled={creatingCustom}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">
                            {format(new Date(date), "EEEE, MMMM d")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {daySessions.length} workout{daySessions.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {daySessions.map((session) => (
                          <div
                            key={session.id}
                            className="text-xs px-2 py-1 bg-muted rounded"
                          >
                            {session.workout.name}
                          </div>
                        ))}
                      </div>
                    </button>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground/70">
                No recent workouts found. Add workouts and set a schedule to get started
              </p>
            </div>
          )}
        </div>
      ) : !hasIncompleteSession && !hasAllSessions && scheduledWorkouts.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {scheduledWorkouts.length} workout(s) scheduled for today
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReorderMode(!reorderMode)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {reorderMode ? "Done" : "Reorder"}
            </Button>
          </div>

          {reorderMode ? (
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Tap and drag to reorder workouts
                </p>
                {orderedWorkouts.map((workout, index) => (
                  <div
                    key={workout.id}
                    data-initial-workout-item
                    data-initial-workout-index={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl transition-all duration-200",
                      draggedIndex === index && "opacity-40",
                      dragOverIndex === index && draggedIndex !== index && "border-2 border-primary border-dashed",
                      draggedIndex !== index && "bg-muted/50 hover:bg-muted cursor-grab active:cursor-grabbing hover:shadow-sm"
                    )}
                    style={{ touchAction: 'none' }}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">{workout.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {workout.workoutType === "time"
                          ? `${workout.weight} min`
                          : `${workout.sets} x ${workout.repsPerSet} @ ${workout.weight}kg`
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">
              <Button onClick={createSessionsForToday} disabled={creating || sessions.length > 0}>
                {creating || sessions.length > 0 ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Start Today&apos;s Workout
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      ) : hasIncompleteSession ? (
        <WorkoutPlayer
          sessions={orderedSessions}
          onUpdateSession={updateSession}
          onRegenerateTip={regenerateTip}
          recentSessions={recentSessions}
          onReorderSessions={reorderSessions}
        />
      ) : allSessionsComplete ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">All workouts completed!</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Great job! Come back tomorrow for more.
          </p>
        </div>
      ) : null}
    </div>
  );
}
