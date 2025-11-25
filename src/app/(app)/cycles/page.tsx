"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Loader2, Plus, Trash2, Edit, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CycleForm } from "@/components/cycle-form";
import type { WorkoutCycle, Workout } from "@/types";

export default function CyclesPage() {
  const [cycles, setCycles] = useState<WorkoutCycle[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCycle, setEditingCycle] = useState<WorkoutCycle | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [cyclesRes, workoutsRes] = await Promise.all([
        fetch("/api/cycles"),
        fetch("/api/workouts"),
      ]);
      const [cyclesData, workoutsData] = await Promise.all([
        cyclesRes.json(),
        workoutsRes.json(),
      ]);
      setCycles(cyclesData);
      setWorkouts(workoutsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCycle = async (data: {
    name: string;
    intervalDays: number | null;
    scheduleDays: number[];
    startDate: string;
    workouts: Array<{
      name: string;
      weight: number;
      restTime: number;
      sets: number;
      repsPerSet: number;
      notes?: string;
    }>;
  }) => {
    await fetch("/api/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchData();
  };

  const handleUpdateCycle = async (data: {
    name: string;
    intervalDays: number | null;
    scheduleDays: number[];
    startDate: string;
    workouts: Array<{
      name: string;
      weight: number;
      restTime: number;
      sets: number;
      repsPerSet: number;
      notes?: string;
    }>;
  }) => {
    if (!editingCycle) return;
    await fetch(`/api/cycles/${editingCycle.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditingCycle(null);
    fetchData();
  };

  const handleDeleteCycle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cycle?")) return;
    await fetch(`/api/cycles/${id}`, { method: "DELETE" });
    fetchData();
  };

  const getScheduleText = (cycle: WorkoutCycle) => {
    if (cycle.intervalDays) {
      return `Every ${cycle.intervalDays} day${cycle.intervalDays > 1 ? "s" : ""}`;
    }
    if (cycle.scheduleDays.length > 0) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return cycle.scheduleDays.map((d) => days[d]).join(", ");
    }
    return "No schedule";
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
          <h1 className="text-2xl font-bold">Workout Cycles</h1>
          <p className="text-muted-foreground">
            Group workouts to cycle through on a schedule
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Cycle
        </Button>
      </div>

      {cycles.length === 0 ? (
        <div className="text-center py-12">
          <RotateCw className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No workout cycles yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Create a cycle to rotate through multiple workouts
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {cycles.map((cycle) => (
            <Card key={cycle.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{cycle.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getScheduleText(cycle)}
                      {cycle.intervalDays && cycle.startDate && (
                        <span className="ml-2">
                          (starting {format(new Date(cycle.startDate), "MMM d, yyyy")})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingCycle(cycle)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCycle(cycle.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {cycle.workouts && cycle.workouts.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Workouts in cycle:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cycle.workouts.map((workout, index) => (
                        <div
                          key={workout.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm"
                        >
                          <span className="text-muted-foreground font-medium">
                            {index + 1}.
                          </span>
                          {workout.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No workouts in this cycle
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CycleForm
        open={showForm || !!editingCycle}
        onClose={() => {
          setShowForm(false);
          setEditingCycle(null);
        }}
        onSubmit={editingCycle ? handleUpdateCycle : handleCreateCycle}
        initialData={editingCycle || undefined}
      />
    </div>
  );
}
