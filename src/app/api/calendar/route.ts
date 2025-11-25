import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Combined endpoint for Calendar page - reduces from 3 API calls to 1
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Fetch all data in parallel
    const [workouts, cycles, sessions] = await Promise.all([
      prisma.workout.findMany({
        where: { userId: session.user.id },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      }),
      prisma.workoutCycle.findMany({
        where: { userId: session.user.id },
        include: {
          workouts: {
            orderBy: { cycleOrder: "asc" },
          },
        },
      }),
      prisma.workoutSession.findMany({
        where: {
          userId: session.user.id,
          ...(startDate && endDate
            ? {
                date: {
                  gte: new Date(startDate),
                  lte: new Date(endDate),
                },
              }
            : {}),
        },
        include: { workout: true },
        orderBy: { date: "desc" },
      }),
    ]);

    return NextResponse.json({
      workouts,
      cycles,
      sessions,
    });
  } catch (error) {
    console.error("Get calendar data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
