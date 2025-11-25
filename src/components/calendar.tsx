"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, isWorkoutScheduledForDate, getCycleWorkoutForDate } from "@/lib/utils";
import type { Workout, WorkoutSession, WorkoutCycle } from "@/types";

interface CalendarProps {
  workouts: Workout[];
  cycles?: WorkoutCycle[];
  sessions: WorkoutSession[];
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}

export function Calendar({
  workouts,
  cycles = [],
  sessions,
  onDateSelect,
  selectedDate,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getWorkoutsForDate = (date: Date): Workout[] => {
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

  const getSessionsForDate = (date: Date) => {
    return sessions.filter((session) => isSameDay(new Date(session.date), date));
  };

  const hasCompletedAllForDate = (date: Date) => {
    const scheduledWorkouts = getWorkoutsForDate(date);
    const dateSessions = getSessionsForDate(date);
    if (scheduledWorkouts.length === 0) return false;
    return scheduledWorkouts.every((workout) =>
      dateSessions.some((s) => s.workout.id === workout.id && s.completed)
    );
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-card rounded-2xl border p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const scheduledWorkouts = getWorkoutsForDate(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const allCompleted = hasCompletedAllForDate(day);
          const hasWorkouts = scheduledWorkouts.length > 0;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "relative aspect-square p-1 rounded-xl flex flex-col items-center justify-center transition-all",
                !isCurrentMonth && "opacity-30",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && isToday && "bg-primary/10 text-primary",
                !isSelected && !isToday && "hover:bg-muted"
              )}
            >
              <span className="text-sm font-medium">{format(day, "d")}</span>
              {hasWorkouts && (
                <div className="flex gap-0.5 mt-0.5">
                  <Dumbbell
                    className={cn(
                      "h-3 w-3",
                      allCompleted
                        ? "text-emerald-500"
                        : isSelected
                        ? "text-primary-foreground/70"
                        : "text-primary/70"
                    )}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Dumbbell className="h-3 w-3 text-primary/70" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-1">
          <Dumbbell className="h-3 w-3 text-emerald-500" />
          <span>Completed</span>
        </div>
      </div>
    </div>
  );
}
