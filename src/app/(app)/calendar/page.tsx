"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Loader2, Dumbbell } from "lucide-react";
import { Calendar } from "@/components/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isWorkoutScheduledForDate, getCycleWorkoutForDate } from "@/lib/utils";
import type { Workout, WorkoutSession, WorkoutCycle } from "@/types";

export default function CalendarPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [cycles, setCycles] = useState<WorkoutCycle[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Single API call instead of 3 separate calls
      const res = await fetch(
        `/api/calendar?startDate=${startOfMonth(selectedDate).toISOString()}&endDate=${endOfMonth(selectedDate).toISOString()}`
      );
      const data = await res.json();
      setWorkouts(data.workouts);
      setCycles(data.cycles);
      setSessions(data.sessions);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get scheduled workouts for date (standalone + from cycles)
  const getScheduledWorkoutsForDate = (date: Date): Workout[] => {
    const result: Workout[] = [];

    // Standalone workouts (not in a cycle)
    const standaloneWorkouts = workouts.filter((w) => !w.cycleId);
    for (const workout of standaloneWorkouts) {
      if (isWorkoutScheduledForDate(workout, date)) {
        result.push(workout);
      }
    }

    // Workouts from cycles
    for (const cycle of cycles) {
      const cycleWorkout = getCycleWorkoutForDate(cycle, date);
      if (cycleWorkout) {
        const fullWorkout = workouts.find((w) => w.id === cycleWorkout.id);
        if (fullWorkout) {
          result.push(fullWorkout);
        }
      }
    }

    return result;
  };

  const scheduledWorkoutsForDate = getScheduledWorkoutsForDate(selectedDate);

  const sessionsForDate = sessions.filter(
    (session) =>
      format(new Date(session.date), "yyyy-MM-dd") ===
      format(selectedDate, "yyyy-MM-dd")
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">View your workout schedule</p>
      </div>

      <Calendar
        workouts={workouts}
        cycles={cycles}
        sessions={sessions}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />

      {/* Selected date details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledWorkoutsForDate.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No workouts scheduled for this day
            </p>
          ) : (
            <div className="space-y-3">
              {scheduledWorkoutsForDate.map((workout) => {
                const session = sessionsForDate.find(
                  (s) => s.workout.id === workout.id
                );
                return (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          session?.completed
                            ? "bg-emerald-500/10"
                            : "bg-primary/10"
                        }`}
                      >
                        <Dumbbell
                          className={`h-5 w-5 ${
                            session?.completed
                              ? "text-emerald-500"
                              : "text-primary"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{workout.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {workout.sets} x {workout.repsPerSet} @ {workout.weight}
                          kg
                        </p>
                      </div>
                    </div>
                    {session?.completed && (
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                        Done
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
