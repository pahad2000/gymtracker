"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { GripVertical, Plus } from "lucide-react";
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
import type { WorkoutCycle } from "@/types";

type WorkoutFormData = {
  name: string;
  workoutType: "weight" | "time";
  weight: number;
  restTime: number;
  sets: number;
  repsPerSet: number;
  notes?: string;
};

type CycleFormData = {
  name: string;
  intervalDays: number | null;
  scheduleDays: number[];
  startDate: string;
  workouts: WorkoutFormData[];
};

interface CycleFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CycleFormData) => Promise<void>;
  initialData?: WorkoutCycle;
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

export function CycleForm({
  open,
  onClose,
  onSubmit,
  initialData,
}: CycleFormProps) {
  const [loading, setLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState<"interval" | "days">(
    initialData?.intervalDays ? "interval" : "days"
  );
  const [formData, setFormData] = useState({
    name: "",
    intervalDays: "2",
    scheduleDays: [] as number[],
    startDate: format(new Date(), "yyyy-MM-dd"),
    workouts: [] as WorkoutFormData[],
  });
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [editingWorkoutIndex, setEditingWorkoutIndex] = useState<number | null>(null);
  const [workoutFormData, setWorkoutFormData] = useState<WorkoutFormData>({
    name: "",
    workoutType: "weight",
    weight: 0,
    restTime: 60,
    sets: 3,
    repsPerSet: 10,
    notes: "",
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setScheduleType(initialData.intervalDays ? "interval" : "days");
      setFormData({
        name: initialData.name,
        intervalDays: initialData.intervalDays?.toString() || "2",
        scheduleDays: initialData.scheduleDays || [],
        startDate: initialData.startDate
          ? format(new Date(initialData.startDate), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        workouts: initialData.workouts?.map((w) => ({
          name: w.name,
          workoutType: w.workoutType || "weight",
          weight: w.weight,
          restTime: w.restTime,
          sets: w.sets,
          repsPerSet: w.repsPerSet,
          notes: w.notes || "",
        })) || [],
      });
    } else {
      setFormData({
        name: "",
        intervalDays: "2",
        scheduleDays: [],
        startDate: format(new Date(), "yyyy-MM-dd"),
        workouts: [],
      });
      setScheduleType("days");
    }
    setShowWorkoutForm(false);
    setEditingWorkoutIndex(null);
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Check interval days is not zero
    if (scheduleType === "interval") {
      const intervalValue = parseInt(formData.intervalDays);
      if (intervalValue <= 0 || isNaN(intervalValue)) {
        alert("Interval days must be at least 1");
        return;
      }
    }

    // Validation: Check at least one day is selected for specific days schedule
    if (scheduleType === "days" && formData.scheduleDays.length === 0) {
      alert("Please select at least one day for the cycle schedule");
      return;
    }

    // Validation: Check at least one workout in the cycle
    if (formData.workouts.length === 0) {
      alert("Please add at least one workout to the cycle");
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        name: formData.name,
        intervalDays:
          scheduleType === "interval" ? parseInt(formData.intervalDays) : null,
        scheduleDays: scheduleType === "days" ? formData.scheduleDays : [],
        startDate: formData.startDate,
        workouts: formData.workouts,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save cycle:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorkout = () => {
    setWorkoutFormData({
      name: "",
      workoutType: "weight",
      weight: 0,
      restTime: 60,
      sets: 3,
      repsPerSet: 10,
      notes: "",
    });
    setEditingWorkoutIndex(null);
    setShowWorkoutForm(true);
  };

  const handleEditWorkout = (index: number) => {
    setWorkoutFormData(formData.workouts[index]);
    setEditingWorkoutIndex(index);
    setShowWorkoutForm(true);
  };

  const handleSaveWorkout = () => {
    // For time-based workouts, set defaults for unused fields
    const workoutToSave = {
      ...workoutFormData,
      restTime: workoutFormData.workoutType === "weight" ? workoutFormData.restTime : 0,
      sets: workoutFormData.workoutType === "weight" ? workoutFormData.sets : 1,
      repsPerSet: workoutFormData.workoutType === "weight" ? workoutFormData.repsPerSet : 1,
    };

    if (editingWorkoutIndex !== null) {
      const newWorkouts = [...formData.workouts];
      newWorkouts[editingWorkoutIndex] = workoutToSave;
      setFormData((prev) => ({ ...prev, workouts: newWorkouts }));
    } else {
      setFormData((prev) => ({ ...prev, workouts: [...prev.workouts, workoutToSave] }));
    }
    setShowWorkoutForm(false);
    setEditingWorkoutIndex(null);
  };

  const handleDeleteWorkout = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      workouts: prev.workouts.filter((_, i) => i !== index),
    }));
  };

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter((d) => d !== day)
        : [...prev.scheduleDays, day],
    }));
  };

  const moveWorkout = (index: number, direction: "up" | "down") => {
    const newWorkouts = [...formData.workouts];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newWorkouts.length) return;
    [newWorkouts[index], newWorkouts[newIndex]] = [newWorkouts[newIndex], newWorkouts[index]];
    setFormData((prev) => ({ ...prev, workouts: newWorkouts }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Cycle" : "Create Workout Cycle"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update your workout cycle settings."
              : "Group workouts to rotate through on a schedule."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Cycle Name</Label>
            <Input
              id="name"
              placeholder="e.g., Push Pull Legs"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
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
                  <Label htmlFor="startDate" className="text-sm">
                    Starting from
                  </Label>
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Workouts in Cycle</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddWorkout}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Workout
              </Button>
            </div>

            {formData.workouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No workouts yet. Add workouts to this cycle.
              </p>
            ) : (
              <div className="border rounded-lg divide-y">
                {formData.workouts.map((workout, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-background"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{workout.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {workout.workoutType === "time"
                          ? `${workout.weight} min`
                          : `${workout.sets}×${workout.repsPerSet} @ ${workout.weight}kg`
                        }
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => moveWorkout(index, "up")}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => moveWorkout(index, "down")}
                        disabled={index === formData.workouts.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleEditWorkout(index)}
                      >
                        ✎
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => handleDeleteWorkout(index)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workout Form Dialog */}
          {showWorkoutForm && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-background border rounded-lg p-6 max-w-md w-full space-y-4">
                <h3 className="text-lg font-semibold">
                  {editingWorkoutIndex !== null ? "Edit Workout" : "Add Workout"}
                </h3>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Workout Type</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={workoutFormData.workoutType === "weight" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setWorkoutFormData((prev) => ({ ...prev, workoutType: "weight" }))}
                        className="flex-1"
                      >
                        Weight-based
                      </Button>
                      <Button
                        type="button"
                        variant={workoutFormData.workoutType === "time" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setWorkoutFormData((prev) => ({ ...prev, workoutType: "time" }))}
                        className="flex-1"
                      >
                        Time-based
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workout-name">Workout Name</Label>
                    <Input
                      id="workout-name"
                      value={workoutFormData.name}
                      onChange={(e) =>
                        setWorkoutFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder={workoutFormData.workoutType === "weight" ? "e.g., Bench Press" : "e.g., Running"}
                    />
                  </div>

                  {workoutFormData.workoutType === "weight" ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="workout-weight">Weight (kg)</Label>
                          <Input
                            id="workout-weight"
                            type="number"
                            min="0"
                            step="0.5"
                            value={workoutFormData.weight}
                            onChange={(e) =>
                              setWorkoutFormData((prev) => ({
                                ...prev,
                                weight: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workout-rest">Rest (seconds)</Label>
                          <Input
                            id="workout-rest"
                            type="number"
                            min="0"
                            value={workoutFormData.restTime}
                            onChange={(e) =>
                              setWorkoutFormData((prev) => ({
                                ...prev,
                                restTime: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="workout-sets">Sets</Label>
                          <Input
                            id="workout-sets"
                            type="number"
                            min="1"
                            value={workoutFormData.sets}
                            onChange={(e) =>
                              setWorkoutFormData((prev) => ({
                                ...prev,
                                sets: parseInt(e.target.value) || 1,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workout-reps">Reps per Set</Label>
                          <Input
                            id="workout-reps"
                            type="number"
                            min="1"
                            placeholder="10"
                            value={workoutFormData.repsPerSet}
                            onChange={(e) =>
                              setWorkoutFormData((prev) => ({
                                ...prev,
                                repsPerSet: parseInt(e.target.value) || 1,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="workout-weight">Duration (minutes)</Label>
                      <Input
                        id="workout-weight"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="30"
                        value={workoutFormData.weight}
                        onChange={(e) =>
                          setWorkoutFormData((prev) => ({
                            ...prev,
                            weight: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Total duration for this cardio workout
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="workout-notes">Notes (optional)</Label>
                    <Input
                      id="workout-notes"
                      value={workoutFormData.notes}
                      onChange={(e) =>
                        setWorkoutFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowWorkoutForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveWorkout}
                    className="flex-1"
                    disabled={!workoutFormData.name}
                  >
                    {editingWorkoutIndex !== null ? "Update" : "Add"}
                  </Button>
                </div>
              </div>
            </div>
          )}

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
