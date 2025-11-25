import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWorkoutTip } from "@/lib/ai";

export async function POST(
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

    const aiTip = await generateWorkoutTip(workout.name);

    const updatedWorkout = await prisma.workout.update({
      where: { id },
      data: { aiTip },
    });

    return NextResponse.json(updatedWorkout);
  } catch (error) {
    console.error("Regenerate tip error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate tip" },
      { status: 500 }
    );
  }
}
