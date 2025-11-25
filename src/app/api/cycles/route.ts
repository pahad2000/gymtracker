import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cycles = await prisma.workoutCycle.findMany({
      where: { userId: session.user.id },
      include: {
        workouts: {
          orderBy: { cycleOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(cycles);
  } catch (error) {
    console.error("Get cycles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cycles" },
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
    const { name, intervalDays, scheduleDays, startDate, workouts } = body;

    // Create the cycle with its workouts
    const cycle = await prisma.workoutCycle.create({
      data: {
        name,
        intervalDays: intervalDays || null,
        scheduleDays: scheduleDays || [],
        startDate: startDate ? new Date(startDate) : new Date(),
        userId: session.user.id,
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

    return NextResponse.json(cycle, { status: 201 });
  } catch (error) {
    console.error("Create cycle error:", error);
    return NextResponse.json(
      { error: "Failed to create cycle" },
      { status: 500 }
    );
  }
}
