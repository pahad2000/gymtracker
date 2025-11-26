"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Target, TrendingUp, Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCharts } from "@/components/stats-charts";

type Stats = {
  totalCompleted: number;
  completionRate: number;
  totalSets: number;
  totalReps: number;
  totalWorkouts: number;
  monthlyStats: { month: string; total: number; completed: number }[];
  weightProgress: {
    workoutId: string;
    workoutName: string;
    workoutType: "weight" | "time";
    data: { session: number; weight: number; date: string }[];
  }[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Completed Workouts",
      value: stats?.totalCompleted || 0,
      icon: Dumbbell,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Completion Rate",
      value: `${stats?.completionRate || 0}%`,
      icon: Target,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Total Sets",
      value: stats?.totalSets || 0,
      icon: Activity,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Total Reps",
      value: stats?.totalReps || 0,
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Track your fitness progress</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      {stats && (
        <StatsCharts
          monthlyStats={stats.monthlyStats}
          weightProgress={stats.weightProgress}
        />
      )}
    </div>
  );
}
