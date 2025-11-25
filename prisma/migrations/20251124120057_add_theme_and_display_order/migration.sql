-- AlterTable
ALTER TABLE "users" ADD COLUMN     "themeMode" TEXT NOT NULL DEFAULT 'auto';

-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0;
