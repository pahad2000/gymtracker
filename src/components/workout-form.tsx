"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Workout } from "@/types";

type WorkoutFormData = {
  name: string;
  workoutType: "weight" | "time";
  weight: number;
  restTime: number;
  sets: number;
  repsPerSet: number;
  notes?: string;
  intervalDays: number | null;
  scheduleDays: number[];
  startDate?: string;
};

interface WorkoutFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (workout: WorkoutFormData) => Promise<void>;
  initialData?: Workout;
}

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function WorkoutForm({
  open,
  onClose,
  onSubmit,
  initialData,
}: WorkoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [workoutType, setWorkoutType] = useState<"weight" | "time">(
    initialData?.workoutType || "weight"
  );
  const [scheduleType, setScheduleType] = useState<"interval" | "days">(
    initialData?.intervalDays ? "interval" : "days"
  );
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    weight: initialData?.weight?.toString() || "",
    restTime: initialData?.restTime?.toString() || "60",
    sets: initialData?.sets?.toString() || "3",
    repsPerSet: initialData?.repsPerSet?.toString() || "10",
    notes: initialData?.notes || "",
    intervalDays: initialData?.intervalDays?.toString() || "1",
    scheduleDays: initialData?.scheduleDays || [],
    startDate: initialData?.startDate
      ? format(new Date(initialData.startDate), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        name: formData.name,
        workoutType,
        weight: parseFloat(formData.weight),
        restTime: parseInt(formData.restTime),
        sets: parseInt(formData.sets),
        repsPerSet: parseInt(formData.repsPerSet),
        notes: formData.notes || undefined,
        intervalDays: scheduleType === "interval" ? parseInt(formData.intervalDays) : null,
        scheduleDays: scheduleType === "days" ? formData.scheduleDays : [],
        startDate: scheduleType === "interval" ? formData.startDate : undefined,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save workout:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter((d) => d !== day)
        : [...prev.scheduleDays, day],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Workout" : "Add New Workout"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update your workout details below."
              : "Create a new workout with your preferred schedule."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Workout Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={workoutType === "weight" ? "default" : "outline"}
                size="sm"
                onClick={() => setWorkoutType("weight")}
                className="flex-1"
              >
                Weight-based
              </Button>
              <Button
                type="button"
                variant={workoutType === "time" ? "default" : "outline"}
                size="sm"
                onClick={() => setWorkoutType("time")}
                className="flex-1"
              >
                Time-based (Cardio)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Exercise Name</Label>
            <Input
              id="name"
              placeholder={workoutType === "weight" ? "e.g., Bench Press" : "e.g., Running"}
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">
                {workoutType === "weight" ? "Weight (kg)" : "Duration (min)"}
              </Label>
              <Input
                id="weight"
                type="number"
                step={workoutType === "weight" ? "0.5" : "1"}
                placeholder="0"
                value={formData.weight}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, weight: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restTime">Rest Time (sec)</Label>
              <Input
                id="restTime"
                type="number"
                placeholder="60"
                value={formData.restTime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, restTime: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sets">Sets</Label>
              <Input
                id="sets"
                type="number"
                placeholder="3"
                value={formData.sets}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sets: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repsPerSet">
                {workoutType === "weight" ? "Reps per Set" : "Duration per Set (sec)"}
              </Label>
              <Input
                id="repsPerSet"
                type="number"
                placeholder={workoutType === "weight" ? "10" : "60"}
                value={formData.repsPerSet}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    repsPerSet: e.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>

          <div className="space-y-3">
            <Label>Schedule</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={scheduleType === "interval" ? "default" : "outline"}
                size="sm"
                onClick={() => setScheduleType("interval")}
              >
                Every N Days
              </Button>
              <Button
                type="button"
                variant={scheduleType === "days" ? "default" : "outline"}
                size="sm"
                onClick={() => setScheduleType("days")}
              >
                Specific Days
              </Button>
            </div>

            {scheduleType === "interval" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Every</span>
                  <Input
                    type="number"
                    min="1"
                    className="w-20"
                    value={formData.intervalDays}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        intervalDays: e.target.value,
                      }))
                    }
                  />
                  <span className="text-sm">day(s)</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm">Starting from</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <label
                    key={day.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={formData.scheduleDays.includes(day.value)}
                      onCheckedChange={() => toggleDay(day.value)}
                    />
                    <span className="text-sm">{day.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : initialData ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
