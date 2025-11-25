"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Loader2, Plus, GripVertical, ChevronUp, ChevronDown, Settings2 } from "lucide-react";
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

      fetchData();
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
      fetchData();
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

      for (const session of sessionsForDay) {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workoutId: session.workoutId }),
        });
      }
      fetchData();
    } catch (error) {
      console.error("Failed to create sessions:", error);
    } finally {
      setCreatingCustom(false);
    }
  };

  // Group recent sessions by date
  const sessionsByDate = recentSessions.reduce((acc, session) => {
    const dateKey = format(new Date(session.date), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, WorkoutSession[]>);

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

  const moveWorkout = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= scheduledWorkouts.length) return;

    const newWorkouts = [...scheduledWorkouts];
    [newWorkouts[index], newWorkouts[newIndex]] = [newWorkouts[newIndex], newWorkouts[index]];

    // Save the new order
    await fetch("/api/workouts/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workoutIds: newWorkouts.map((w) => w.id) }),
    });
    fetchData();
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

  const sessionsToShow = sessions.filter((s) => !s.completed);

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

          {Object.keys(sessionsByDate).length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Recent Workout Days
              </p>
              {Object.entries(sessionsByDate).map(([date, daySessions]) => (
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
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground/70">
                No recent workouts found. Add workouts and set a schedule to get started
              </p>
            </div>
          )}
        </div>
      ) : sessionsToShow.length === 0 && !hasAllSessions && scheduledWorkouts.length > 0 ? (
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
                {scheduledWorkouts.map((workout, index) => (
                  <div
                    key={workout.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 font-medium">{workout.name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveWorkout(index, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveWorkout(index, "down")}
                        disabled={index === scheduledWorkouts.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">
              <Button onClick={createSessionsForToday} disabled={creating}>
                {creating ? (
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
      ) : sessionsToShow.length > 0 ? (
        <WorkoutPlayer
          sessions={sessionsToShow}
          onUpdateSession={updateSession}
          onRegenerateTip={regenerateTip}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">All workouts completed!</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Great job! Come back tomorrow for more.
          </p>
        </div>
      )}
    </div>
  );
}
