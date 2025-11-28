import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWeeklyReport, sendWeeklyReportEmail } from "@/lib/weekly-report";

// This endpoint should be called weekly by a cron job
// For Vercel: Configure in vercel.json
// For other platforms: Use external cron service (e.g., cron-job.org, EasyCron)
// Protect with a secret token to prevent unauthorized access

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users who have weekly emails enabled
    const users = await prisma.user.findMany({
      where: {
        weeklyEmailsEnabled: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const results = [];

    for (const user of users) {
      try {
        // Generate weekly report
        const report = await generateWeeklyReport(user.id);

        // Only send if user had at least one workout this week
        if (report.thisWeekCount > 0) {
          const emailSent = await sendWeeklyReportEmail(user.email, report);
          results.push({
            userId: user.id,
            email: user.email,
            sent: emailSent,
            workouts: report.thisWeekCount,
          });
        } else {
          results.push({
            userId: user.id,
            email: user.email,
            sent: false,
            reason: "No workouts this week",
          });
        }
      } catch (error) {
        console.error(`Failed to send report to ${user.email}:`, error);
        results.push({
          userId: user.id,
          email: user.email,
          sent: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalUsers: users.length,
      results,
    });
  } catch (error) {
    console.error("Weekly reports cron error:", error);
    return NextResponse.json(
      { error: "Failed to send weekly reports" },
      { status: 500 }
    );
  }
}
