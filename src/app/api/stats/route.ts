import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { getScheduledDatesUpTo } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);

    // Fetch all data in parallel for better performance
    const [user, allSessions, workouts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { adaptiveMode: true },
      }),
      prisma.workoutSession.findMany({
        where: { userId: session.user.id },
        include: { workout: true },
        orderBy: { date: "asc" },
      }),
      prisma.workout.findMany({
        where: { userId: session.user.id },
      }),
    ]);

    const adaptiveMode = user?.adaptiveMode ?? false;

    // Calculate total completed exercises
    const completedSessions = allSessions.filter((s) => s.completed);
    const totalCompleted = completedSessions.length;

    // Calculate completion rate
    let completionRate: number;
    let totalScheduled: number = 0;

    if (adaptiveMode) {
      // Adaptive mode: completed / total scheduled to date
      // Count all scheduled workout dates from start to today
      for (const workout of workouts) {
        const scheduledDates = getScheduledDatesUpTo(workout, now);
        totalScheduled += scheduledDates.length;
      }
      completionRate =
        totalScheduled > 0
          ? Math.round((totalCompleted / totalScheduled) * 100)
          : 0;
    } else {
      // Normal mode: completed sessions / all sessions created
      completionRate =
        allSessions.length > 0
          ? Math.round((completedSessions.length / allSessions.length) * 100)
          : 0;
      totalScheduled = allSessions.length;
    }

    // Get recent sessions (last 6 months) for charts
    const recentSessions = allSessions.filter(
      (s) => new Date(s.date) >= sixMonthsAgo
    );

    // Monthly stats
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthSessions = recentSessions.filter((s) => {
        const date = new Date(s.date);
        return date >= monthStart && date <= monthEnd;
      });
      const monthCompleted = monthSessions.filter((s) => s.completed).length;

      // For adaptive mode, calculate scheduled for this month
      let monthScheduled = monthSessions.length;
      if (adaptiveMode) {
        monthScheduled = 0;
        for (const workout of workouts) {
          const startDate = new Date(workout.startDate);
          if (startDate <= monthEnd) {
            const effectiveStart = startDate > monthStart ? startDate : monthStart;
            const scheduledDates = getScheduledDatesUpTo(workout, monthEnd);
            monthScheduled += scheduledDates.filter(
              (d) => d >= effectiveStart && d <= monthEnd
            ).length;
          }
        }
      }

      monthlyStats.push({
        month: format(monthStart, "MMM"),
        total: adaptiveMode ? monthScheduled : monthSessions.length,
        completed: monthCompleted,
      });
    }

    // Weight progress per workout
    const weightProgress = workouts.map((workout) => {
      const workoutSessions = completedSessions
        .filter((s) => s.workoutId === workout.id)
        .slice(-10); // Last 10 sessions

      return {
        workoutId: workout.id,
        workoutName: workout.name,
        data: workoutSessions.map((s, index) => ({
          session: index + 1,
          weight: s.weightUsed || workout.weight,
          date: format(new Date(s.date), "MMM d"),
        })),
      };
    });

    // Total sets completed
    const totalSets = completedSessions.reduce(
      (sum, s) => sum + s.setsCompleted,
      0
    );

    // Total reps
    const totalReps = completedSessions.reduce(
      (sum, s) => sum + s.repsPerSet.reduce((a, b) => a + b, 0),
      0
    );

    return NextResponse.json({
      totalCompleted,
      completionRate,
      totalSets,
      totalReps,
      totalScheduled,
      monthlyStats,
      weightProgress,
      totalWorkouts: workouts.length,
      adaptiveMode,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
