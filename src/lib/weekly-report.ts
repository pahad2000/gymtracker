import { prisma } from "./prisma";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

export async function generateWeeklyReport(userId: string) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  // Get this week's sessions
  const thisWeekSessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
      completed: true,
    },
    include: { workout: true },
  });

  // Get last week's sessions for comparison
  const lastWeekSessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      date: {
        gte: lastWeekStart,
        lte: lastWeekEnd,
      },
      completed: true,
    },
    include: { workout: true },
  });

  // Calculate stats
  const thisWeekCount = thisWeekSessions.length;
  const lastWeekCount = lastWeekSessions.length;
  const totalSets = thisWeekSessions.reduce((sum, s) => sum + s.setsCompleted, 0);
  const totalReps = thisWeekSessions.reduce(
    (sum, s) => sum + s.repsPerSet.reduce((a, b) => a + b, 0),
    0
  );

  // Calculate total weight lifted
  const totalWeightLifted = thisWeekSessions.reduce((sum, session) => {
    const weight = session.weightUsed || session.workout.weight;
    const sets = session.setsCompleted;
    const repsPerSet = session.workout.repsPerSet;
    return sum + (weight * sets * repsPerSet);
  }, 0);

  // Find workouts with PRs (personal records)
  const prs: string[] = [];
  for (const session of thisWeekSessions) {
    const previousSessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        workoutId: session.workoutId,
        completed: true,
        date: {
          lt: session.date,
        },
      },
      orderBy: { date: "desc" },
      take: 1,
    });

    if (previousSessions.length > 0) {
      const prevWeight = previousSessions[0].weightUsed || previousSessions[0].workout.weight;
      const currentWeight = session.weightUsed || session.workout.weight;
      if (currentWeight > prevWeight) {
        prs.push(session.workout.name);
      }
    }
  }

  return {
    weekStart: format(weekStart, "MMM d"),
    weekEnd: format(weekEnd, "MMM d"),
    thisWeekCount,
    lastWeekCount,
    totalSets,
    totalReps,
    totalWeightLifted: Math.round(totalWeightLifted),
    prs,
    improvement: thisWeekCount - lastWeekCount,
  };
}

export async function sendWeeklyReportEmail(email: string, report: any) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return false;
  }

  const improvementText = report.improvement > 0
    ? `<p style="color: #10b981; font-weight: bold;">📈 ${report.improvement} more workouts than last week!</p>`
    : report.improvement < 0
    ? `<p style="color: #f59e0b;">📉 ${Math.abs(report.improvement)} fewer workouts than last week</p>`
    : `<p>Same as last week - keep it up!</p>`;

  const prsText = report.prs.length > 0
    ? `
    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #065f46;">🎉 Personal Records This Week!</h3>
      <ul style="margin: 10px 0;">
        ${report.prs.map((pr: string) => `<li>${pr}</li>`).join('')}
      </ul>
    </div>
    `
    : '';

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: [email],
        subject: `Your Weekly Workout Summary (${report.weekStart} - ${report.weekEnd})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; border-bottom: 3px solid #3b82f6; padding-bottom: 10px;">
              Weekly Workout Summary
            </h1>
            <p style="color: #666; font-size: 14px;">${report.weekStart} - ${report.weekEnd}</p>

            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #1e293b;">This Week's Stats</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="background-color: white; padding: 15px; border-radius: 6px; text-align: center;">
                  <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${report.thisWeekCount}</div>
                  <div style="color: #64748b; font-size: 14px;">Workouts Completed</div>
                </div>
                <div style="background-color: white; padding: 15px; border-radius: 6px; text-align: center;">
                  <div style="font-size: 32px; font-weight: bold; color: #8b5cf6;">${report.totalSets}</div>
                  <div style="color: #64748b; font-size: 14px;">Total Sets</div>
                </div>
                <div style="background-color: white; padding: 15px; border-radius: 6px; text-align: center;">
                  <div style="font-size: 32px; font-weight: bold; color: #ec4899;">${report.totalReps}</div>
                  <div style="color: #64748b; font-size: 14px;">Total Reps</div>
                </div>
                <div style="background-color: white; padding: 15px; border-radius: 6px; text-align: center;">
                  <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${report.totalWeightLifted}</div>
                  <div style="color: #64748b; font-size: 14px;">KG Lifted</div>
                </div>
              </div>
            </div>

            ${improvementText}
            ${prsText}

            <div style="margin-top: 30px; padding: 20px; background-color: #f1f5f9; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #475569;">Keep up the great work! 💪</p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">
                This is your automated weekly report from GymTracker
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send email:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}
