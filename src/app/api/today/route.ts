import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Combined endpoint for Today page - reduces from 5 API calls to 1
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch all data in parallel
    const [workouts, cycles, todaySessions, recentSessions] = await Promise.all([
      // All workouts
      prisma.workout.findMany({
        where: { userId: session.user.id },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      }),
      // All cycles with their workouts
      prisma.workoutCycle.findMany({
        where: { userId: session.user.id },
        include: {
          workouts: {
            orderBy: { cycleOrder: "asc" },
          },
        },
      }),
      // Today's sessions
      prisma.workoutSession.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        include: { workout: true },
      }),
      // Recent completed sessions from last 60 days (excluding today)
      prisma.workoutSession.findMany({
        where: {
          userId: session.user.id,
          completed: true,
          date: {
            lt: todayStart,
            gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
        },
        include: { workout: true },
        orderBy: { date: "desc" },
      }),
    ]);

    return NextResponse.json({
      workouts,
      cycles,
      todaySessions,
      recentSessions,
    });
  } catch (error) {
    console.error("Get today data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
