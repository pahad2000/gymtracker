import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWorkoutTip } from "@/lib/ollama";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workouts = await prisma.workout.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
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

    // Generate AI tip for the workout
    const aiTip = await generateWorkoutTip(name);

    const workout = await prisma.workout.create({
      data: {
        name,
        weight: parseFloat(weight),
        restTime: parseInt(restTime),
        sets: parseInt(sets),
        repsPerSet: parseInt(repsPerSet),
        notes,
        aiTip,
        intervalDays: intervalDays ? parseInt(intervalDays) : null,
        scheduleDays: scheduleDays || [],
        startDate: startDate ? new Date(startDate) : new Date(),
        userId: session.user.id,
      },
    });

    return NextResponse.json(workout);
  } catch (error) {
    console.error("Create workout error:", error);
    return NextResponse.json(
      { error: "Failed to create workout" },
      { status: 500 }
    );
  }
}
