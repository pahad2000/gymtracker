-- DropForeignKey
ALTER TABLE "workouts" DROP CONSTRAINT IF EXISTS "workouts_cycleId_fkey";

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "workout_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
