import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);

    // Fetch all data in parallel for better performance
    const [allSessions, workouts] = await Promise.all([
      prisma.workoutSession.findMany({
        where: { userId: session.user.id },
        include: { workout: true },
        orderBy: { date: "asc" },
      }),
      prisma.workout.findMany({
        where: { userId: session.user.id },
      }),
    ]);

    // Calculate total completed exercises
    const completedSessions = allSessions.filter((s) => s.completed);
    const totalCompleted = completedSessions.length;

    // Calculate completion rate: completed sessions / all sessions created
    const completionRate =
      allSessions.length > 0
        ? Math.round((completedSessions.length / allSessions.length) * 100)
        : 0;
    const totalScheduled = allSessions.length;

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

      monthlyStats.push({
        month: format(monthStart, "MMM"),
        total: monthSessions.length,
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
        workoutType: workout.workoutType,
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
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
