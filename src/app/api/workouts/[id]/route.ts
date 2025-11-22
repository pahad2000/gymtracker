import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWorkoutTip } from "@/lib/ollama";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const workout = await prisma.workout.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    return NextResponse.json(workout);
  } catch (error) {
    console.error("Get workout error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, weight, restTime, sets, repsPerSet, notes, intervalDays, scheduleDays, startDate } = body;

    const existingWorkout = await prisma.workout.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingWorkout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    // Regenerate AI tip if name changed
    let aiTip = existingWorkout.aiTip;
    if (name !== existingWorkout.name) {
      aiTip = await generateWorkoutTip(name);
    }

    const workout = await prisma.workout.update({
      where: { id },
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
        startDate: startDate ? new Date(startDate) : existingWorkout.startDate,
      },
    });

    return NextResponse.json(workout);
  } catch (error) {
    console.error("Update workout error:", error);
    return NextResponse.json(
      { error: "Failed to update workout" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingWorkout = await prisma.workout.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingWorkout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    await prisma.workout.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete workout error:", error);
    return NextResponse.json(
      { error: "Failed to delete workout" },
      { status: 500 }
    );
  }
}
