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
