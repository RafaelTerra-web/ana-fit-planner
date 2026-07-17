export type AppTab = 'today' | 'workout' | 'diet' | 'progress' | 'settings';

export type ThemeName = 'dark';

export type Profile = {
  name: string;
  heightCm: number;
  weightKg: number;
  trainingDays: number;
  cardioDays: number;
  preferredFoods: string[];
  avoidedFoods: string[];
  theme: ThemeName;
};

export type Goals = {
  calories: number;
  protein: number;
  fat: number;
  waterLiters: number;
};

export type Meal = {
  id: string;
  title: string;
  time: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  note: string;
};

export type ReminderKind = 'meal' | 'workout';

export type Reminder = {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
  kind: ReminderKind;
};

export type NotificationSettings = {
  enabled: boolean;
  permission: NotificationPermission | 'unsupported' | 'not-requested';
  reminders: Reminder[];
  timezone: string;
  subscriptionEndpoint?: string;
  lastSync?: string;
};

export type FoodGroup = 'proteins' | 'carbs' | 'fats';

export type Food = {
  name: string;
  group: FoodGroup;
  note?: string;
};

export type MuscleGroup =
  | 'glutes'
  | 'quadriceps'
  | 'hamstrings'
  | 'back'
  | 'chest'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'calves';

export type ExerciseTarget = {
  muscle: MuscleGroup;
  role: 'primary' | 'secondary';
};

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  rir?: string;
  note?: string;
  targets: ExerciseTarget[];
  unilateral?: boolean;
  progressionType: 'large' | 'isolation';
};

export type Workout = {
  id: string;
  title: string;
  shortTitle: string;
  focus: string;
  dayLabel: string;
  exercises: Exercise[];
  cardio?: string;
};

export type WeekActivityType = 'workout' | 'cardio' | 'rest';

export type WeekPlanItem = {
  dayIndex: number;
  dayLabel: string;
  activityType: WeekActivityType;
  title: string;
  workoutId?: string;
  cardio?: string;
  rest?: string;
};

export type LegacyExerciseLog = {
  weight: string;
  reps: string;
  setsDone: string;
  rir: string;
  note: string;
  done: boolean;
};

export type ExerciseSetLog = {
  id: string;
  weight: string;
  reps: string;
  rir: string;
  completed: boolean;
};

export type ExerciseLog = {
  exerciseId: string;
  exerciseName: string;
  targetReps: string;
  targetRir?: string;
  plannedSetCount: number;
  sets: ExerciseSetLog[];
  note: string;
};

export type WorkoutSession = {
  id: string;
  dateKey: string;
  workoutId: string;
  workoutTitle: string;
  startedAt: string;
  completedAt?: string;
  plannedSetCount: number;
  exerciseOrder: string[];
  exerciseLogs: Record<string, ExerciseLog>;
};

export type RankTierId = 'ferro' | 'bronze' | 'prata' | 'ouro' | 'platina' | 'diamante' | 'elite' | 'olympia';

export type RankDivision = 1 | 2 | 3;

export type RankLevelId = `${RankTierId}-${RankDivision}`;

export type RankXpKind =
  | 'workout'
  | 'cardio'
  | 'nutrition'
  | 'water'
  | 'steps'
  | 'progress-checkin'
  | 'inactivity-decay';

export type RankXpEvent = {
  id: string;
  kind: RankXpKind;
  xp: number;
  dateKey: string;
  sourceId: string;
  awardedAt: string;
};

export type RankState = {
  schemaVersion: 3;
  startedOn: string;
  events: Record<string, RankXpEvent>;
  decayCursor?: {
    anchorTimestamp: number;
    processedCheckpoints: number;
  };
  lastCelebratedLevelId?: RankLevelId;
};

export type DailyChecks = {
  trainingDone: boolean;
  cardioDone: boolean;
  waterDone: boolean;
  stepsDone: boolean;
  meals: Record<string, boolean>;
};

export type ProgressEntry = {
  id: string;
  date: string;
  weightKg: number;
  waistCm: number;
  hipCm: number;
  hipThrustKg: number;
  bulgarianKg: number;
  rdlKg: number;
  trainingFrequency: number;
  cardioFrequency: number;
  photoDataUrl?: string;
};

export type AppData = {
  schemaVersion: 5;
  profile: Profile;
  goals: Goals;
  meals: Meal[];
  notifications: NotificationSettings;
  workouts: Workout[];
  weekPlan: WeekPlanItem[];
  dailyChecks: Record<string, DailyChecks>;
  exerciseLogs: Record<string, LegacyExerciseLog>;
  workoutSessions: Record<string, WorkoutSession>;
  activeWorkoutSessionId: string | null;
  rank: RankState;
  progressEntries: ProgressEntry[];
};
