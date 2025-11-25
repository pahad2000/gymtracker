import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWorkoutTipAsync } from "@/lib/ai";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workouts = await prisma.workout.findMany({
      where: { userId: session.user.id },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(workouts);
  } catch (error) {
    console.error("Get workouts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, weight, restTime, sets, repsPerSet, notes, intervalDays, scheduleDays, startDate } = body;

    // Create workout first, then generate AI tip asynchronously
    const workout = await prisma.workout.create({
      data: {
        name,
        weight: parseFloat(weight),
        restTime: parseInt(restTime),
        sets: parseInt(sets),
        repsPerSet: parseInt(repsPerSet),
        notes,
        aiTip: "Generating tip...", // Placeholder
        intervalDays: intervalDays ? parseInt(intervalDays) : null,
        scheduleDays: scheduleDays || [],
        startDate: startDate ? new Date(startDate) : new Date(),
        userId: session.user.id,
      },
    });

    // Generate AI tip asynchronously (doesn't block response)
    generateWorkoutTipAsync(workout.id, name).catch(console.error);

    return NextResponse.json(workout);
  } catch (error) {
    console.error("Create workout error:", error);
    return NextResponse.json(
      { error: "Failed to create workout" },
      { status: 500 }
    );
  }
}
