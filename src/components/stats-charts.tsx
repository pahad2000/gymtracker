"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

type MonthlyStats = {
  month: string;
  total: number;
  completed: number;
};

type WeightProgress = {
  workoutId: string;
  workoutName: string;
  workoutType: "weight" | "time";
  data: { session: number; weight: number; date: string }[];
};

interface StatsChartsProps {
  monthlyStats: MonthlyStats[];
  weightProgress: WeightProgress[];
}

export function StatsCharts({ monthlyStats, weightProgress }: StatsChartsProps) {
  const [selectedWorkout, setSelectedWorkout] = useState<string>(
    weightProgress[0]?.workoutId || ""
  );

  const selectedWorkoutData = weightProgress.find(
    (w) => w.workoutId === selectedWorkout
  );

  return (
    <div className="space-y-6">
      {/* Monthly completion chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.75rem",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="total"
                  name="Total Sessions"
                  fill="hsl(var(--muted))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weight progress chart */}
      {weightProgress.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Workout Progress</CardTitle>
              <Select value={selectedWorkout} onValueChange={setSelectedWorkout}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select workout" />
                </SelectTrigger>
                <SelectContent>
                  {weightProgress.map((workout) => (
                    <SelectItem key={workout.workoutId} value={workout.workoutId}>
                      {workout.workoutName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {selectedWorkoutData && selectedWorkoutData.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedWorkoutData.data}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      domain={["dataMin - 5", "dataMax + 5"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.75rem",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      name={selectedWorkoutData.workoutType === "time" ? "Duration (min)" : "Weight (kg)"}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available for this workout yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
