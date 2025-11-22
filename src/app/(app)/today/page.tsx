"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkoutPlayer } from "@/components/workout-player";
import { isWorkoutScheduledForDate } from "@/lib/utils";
import type { Workout, WorkoutSession } from "@/types";

export default function TodayPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const today = new Date();

  const fetchData = useCallback(async () => {
    try {
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const [workoutsRes, sessionsRes] = await Promise.all([
        fetch("/api/workouts"),
        fetch(
          `/api/sessions?startDate=${todayStart.toISOString()}&endDate=${todayEnd.toISOString()}`
        ),
      ]);
      const [workoutsData, sessionsData] = await Promise.all([
        workoutsRes.json(),
        sessionsRes.json(),
      ]);
      setWorkouts(workoutsData);
      setSessions(sessionsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scheduledWorkouts = workouts.filter((workout) =>
    isWorkoutScheduledForDate(workout, today)
  );

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

  const updateSession = async (
    sessionId: string,
    data: { setsCompleted?: number; repsPerSet?: number[]; completed?: boolean }
  ) => {
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchData();
  };

  const regenerateTip = async (workoutId: string) => {
    await fetch(`/api/workouts/${workoutId}/regenerate-tip`, {
      method: "POST",
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

  // Get only incomplete sessions
  const incompleteSessions = sessions.filter((s) => !s.completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today&apos;s Workout</h1>
        <p className="text-muted-foreground">{format(today, "EEEE, MMMM d")}</p>
      </div>

      {scheduledWorkouts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No workouts scheduled for today</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Add workouts and set a schedule to get started
          </p>
        </div>
      ) : !hasAllSessions ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">
            You have {scheduledWorkouts.length} workout(s) scheduled for today
          </p>
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
      ) : (
        <WorkoutPlayer
          sessions={incompleteSessions}
          onUpdateSession={updateSession}
          onRegenerateTip={regenerateTip}
        />
      )}
    </div>
  );
}
