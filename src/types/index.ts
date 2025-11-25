export type WorkoutCycle = {
  id: string;
  name: string;
  intervalDays: number | null;
  scheduleDays: number[];
  startDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string;
  workouts?: Workout[];
};

export type Workout = {
  id: string;
  name: string;
  workoutType: "weight" | "time";
  weight: number; // For time-based, this stores duration in seconds
  restTime: number;
  sets: number;
  repsPerSet: number; // For time-based, this stores duration per set in seconds
  notes?: string | null;
  aiTip?: string | null;
  intervalDays: number | null;
  scheduleDays: number[];
  startDate: Date;
  cycleId?: string | null;
  cycle?: WorkoutCycle | null;
  cycleOrder?: number | null;
  displayOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string;
};

export type WorkoutSession = {
  id: string;
  date: Date;
  completed: boolean;
  setsCompleted: number;
  repsPerSet: number[];
  weightUsed?: number | null;
  duration?: number | null;
  workoutId: string;
  userId?: string;
  workout: Workout;
};

export type User = {
  id: string;
  email: string;
  name?: string | null;
};

export type MonthlyStats = {
  month: string;
  total: number;
  completed: number;
};

export type WeightProgress = {
  workoutId: string;
  workoutName: string;
  data: { session: number; weight: number; date: string }[];
};

export type Stats = {
  totalCompleted: number;
  completionRate: number;
  totalSets: number;
  totalReps: number;
  totalWorkouts: number;
  monthlyStats: MonthlyStats[];
  weightProgress: WeightProgress[];
};
