import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function isWorkoutScheduledForDate(
  workout: {
    intervalDays: number | null;
    scheduleDays: number[];
    startDate: Date;
  },
  date: Date
): boolean {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const startDate = new Date(workout.startDate);
  startDate.setHours(0, 0, 0, 0);

  // If target date is before start date, workout is not scheduled
  if (targetDate < startDate) return false;

  // If using specific weekdays
  if (workout.scheduleDays.length > 0) {
    return workout.scheduleDays.includes(targetDate.getDay());
  }

  // If using interval days
  if (workout.intervalDays && workout.intervalDays > 0) {
    const diffTime = targetDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays % workout.intervalDays === 0;
  }

  return false;
}

/**
 * Gets all scheduled dates for a workout up to a given date
 */
export function getScheduledDatesUpTo(
  workout: {
    intervalDays: number | null;
    scheduleDays: number[];
    startDate: Date;
  },
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  const start = new Date(workout.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const current = new Date(start);
  while (current <= end) {
    if (isWorkoutScheduledForDate(workout, current)) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Checks if a cycle is scheduled for a given date
 */
export function isCycleScheduledForDate(
  cycle: {
    intervalDays: number | null;
    scheduleDays: number[];
    startDate: Date;
  },
  date: Date
): boolean {
  return isWorkoutScheduledForDate(cycle, date);
}

/**
 * Gets all scheduled dates for a cycle up to a given date
 */
export function getScheduledCycleDatesUpTo(
  cycle: {
    intervalDays: number | null;
    scheduleDays: number[];
    startDate: Date;
  },
  endDate: Date
): Date[] {
  return getScheduledDatesUpTo(cycle, endDate);
}

/**
 * Determines which workout in a cycle should be done on a given date
 * Returns the workout index (0-based) or -1 if not scheduled
 */
export function getCycleWorkoutIndexForDate(
  cycle: {
    intervalDays: number | null;
    scheduleDays: number[];
    startDate: Date;
  },
  date: Date,
  totalWorkoutsInCycle: number
): number {
  if (totalWorkoutsInCycle === 0) return -1;
  if (!isCycleScheduledForDate(cycle, date)) return -1;

  // Count how many scheduled dates have occurred since start (including target date)
  const scheduledDates = getScheduledCycleDatesUpTo(cycle, date);
  const dateCount = scheduledDates.length;

  if (dateCount === 0) return -1;

  // Cycle through workouts: 0, 1, 2, 0, 1, 2, ...
  return (dateCount - 1) % totalWorkoutsInCycle;
}

/**
 * Gets the workout from a cycle that should be done on a given date
 */
export function getCycleWorkoutForDate<T extends { id: string }>(
  cycle: {
    intervalDays: number | null;
    scheduleDays: number[];
    startDate: Date;
    workouts?: T[];
  },
  date: Date
): T | null {
  const workouts = cycle.workouts || [];
  if (workouts.length === 0) return null;

  const index = getCycleWorkoutIndexForDate(cycle, date, workouts.length);
  if (index === -1) return null;

  return workouts[index];
}
