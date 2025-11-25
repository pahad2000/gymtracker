import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workoutIds } = body;

    if (!Array.isArray(workoutIds)) {
      return NextResponse.json({ error: "Invalid workout IDs" }, { status: 400 });
    }

    // Update display order for each workout
    for (let i = 0; i < workoutIds.length; i++) {
      await prisma.workout.updateMany({
        where: {
          id: workoutIds[i],
          userId: session.user.id,
        },
        data: {
          displayOrder: i,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder workouts error:", error);
    return NextResponse.json(
      { error: "Failed to reorder workouts" },
      { status: 500 }
    );
  }
}
