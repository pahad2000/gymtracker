import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { enabled } = body;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: enabled,
        // Clear any existing codes when disabling
        twoFactorCode: enabled ? undefined : null,
        twoFactorExpires: enabled ? undefined : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: enabled ? "2FA enabled successfully" : "2FA disabled successfully"
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { error: "Failed to update 2FA settings" },
      { status: 500 }
    );
  }
}
