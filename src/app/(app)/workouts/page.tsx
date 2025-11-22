"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkoutList } from "@/components/workout-list";
import { WorkoutForm } from "@/components/workout-form";
import type { Workout } from "@/types";

type WorkoutFormData = {
  name: string;
  weight: number;
  restTime: number;
  sets: number;
  repsPerSet: number;
  notes?: string;
  intervalDays: number | null;
  scheduleDays: number[];
};

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);

  const fetchWorkouts = useCallback(async () => {
    try {
      const res = await fetch("/api/workouts");
      const data = await res.json();
      setWorkouts(data);
    } catch (error) {
      console.error("Failed to fetch workouts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const handleCreate = async (workout: WorkoutFormData) => {
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workout),
    });
    if (res.ok) {
      fetchWorkouts();
    }
  };

  const handleUpdate = async (workout: WorkoutFormData) => {
    if (!editingWorkout) return;
    const res = await fetch(`/api/workouts/${editingWorkout.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workout),
    });
    if (res.ok) {
      fetchWorkouts();
      setEditingWorkout(null);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    }
  };

  const handleEdit = (workout: Workout) => {
    setEditingWorkout(workout);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingWorkout(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-muted-foreground">Manage your exercises</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Workout
        </Button>
      </div>

      <WorkoutList
        workouts={workouts}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <WorkoutForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={editingWorkout ? handleUpdate : handleCreate}
        initialData={editingWorkout || undefined}
      />
    </div>
  );
}
