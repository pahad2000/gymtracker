import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const cycle = await prisma.workoutCycle.findUnique({
      where: { id, userId: session.user.id },
      include: {
        workouts: {
          orderBy: { cycleOrder: "asc" },
        },
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    return NextResponse.json(cycle);
  } catch (error) {
    console.error("Get cycle error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cycle" },
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
    const { name, intervalDays, scheduleDays, startDate, workouts } = body;

    // Delete existing cycle workouts
    await prisma.workout.deleteMany({
      where: { cycleId: id },
    });

    // Update the cycle with new workouts
    const cycle = await prisma.workoutCycle.update({
      where: { id, userId: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(intervalDays !== undefined && { intervalDays }),
        ...(scheduleDays !== undefined && { scheduleDays }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        workouts: {
          create: workouts?.map((workout: any, index: number) => ({
            name: workout.name,
            workoutType: workout.workoutType || "weight",
            weight: workout.weight,
            restTime: workout.restTime,
            sets: workout.sets,
            repsPerSet: workout.repsPerSet,
            notes: workout.notes || null,
            cycleOrder: index,
            // These fields are required but ignored for cycle workouts
            intervalDays: null,
            scheduleDays: [],
            startDate: new Date(),
            userId: session.user.id,
          })) || [],
        },
      },
      include: {
        workouts: {
          orderBy: { cycleOrder: "asc" },
        },
      },
    });

    return NextResponse.json(cycle);
  } catch (error) {
    console.error("Update cycle error:", error);
    return NextResponse.json(
      { error: "Failed to update cycle" },
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

    // Delete the cycle (workouts will be cascade deleted)
    await prisma.workoutCycle.delete({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete cycle error:", error);
    return NextResponse.json(
      { error: "Failed to delete cycle" },
      { status: 500 }
    );
  }
}
