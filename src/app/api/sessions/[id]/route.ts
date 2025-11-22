import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { setsCompleted, repsPerSet, completed, duration, weightUsed } = body;

    const existingSession = await prisma.workoutSession.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const workoutSession = await prisma.workoutSession.update({
      where: { id },
      data: {
        setsCompleted: setsCompleted ?? existingSession.setsCompleted,
        repsPerSet: repsPerSet ?? existingSession.repsPerSet,
        completed: completed ?? existingSession.completed,
        duration: duration ?? existingSession.duration,
        weightUsed: weightUsed ?? existingSession.weightUsed,
      },
      include: { workout: true },
    });

    return NextResponse.json(workoutSession);
  } catch (error) {
    console.error("Update session error:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
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

    const existingSession = await prisma.workoutSession.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await prisma.workoutSession.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
