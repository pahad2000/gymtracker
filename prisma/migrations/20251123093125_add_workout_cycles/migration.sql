-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "cycleId" TEXT,
ADD COLUMN     "cycleOrder" INTEGER;

-- CreateTable
CREATE TABLE "workout_cycles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intervalDays" INTEGER,
    "scheduleDays" INTEGER[],
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "workout_cycles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "workout_cycles" ADD CONSTRAINT "workout_cycles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "workout_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
