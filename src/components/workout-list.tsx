"use client";

import { useState } from "react";
import { Pencil, Trash2, MoreVertical, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Workout } from "@/types";

interface WorkoutListProps {
  workouts: Workout[];
  onEdit: (workout: Workout) => void;
  onDelete: (id: string) => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WorkoutList({ workouts, onEdit, onDelete }: WorkoutListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  const getScheduleText = (workout: Workout) => {
    if (workout.intervalDays) {
      return workout.intervalDays === 1
        ? "Every day"
        : `Every ${workout.intervalDays} days`;
    }
    if (workout.scheduleDays.length > 0) {
      return workout.scheduleDays.map((d) => WEEKDAY_LABELS[d]).join(", ");
    }
    return "Not scheduled";
  };

  if (workouts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Dumbbell className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-muted-foreground">No workouts yet</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Add your first workout to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <Card
          key={workout.id}
          className={deletingId === workout.id ? "opacity-50" : ""}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{workout.name}</h3>
                  <span className="text-primary font-medium shrink-0">
                    {workout.weight} {workout.workoutType === "time" ? "min" : "kg"}
                  </span>
                </div>
                {workout.workoutType === "weight" && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                    <span>
                      {workout.sets} sets × {workout.repsPerSet} reps
                    </span>
                    <span>{workout.restTime}s rest</span>
                  </div>
                )}
                <div className="mt-2 text-xs text-muted-foreground/70">
                  {getScheduleText(workout)}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(workout)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(workout.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
