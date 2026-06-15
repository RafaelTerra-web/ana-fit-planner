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

export type WeekPlanItem = {
  dayIndex: number;
  dayLabel: string;
  title: string;
  workoutId?: string;
  cardio?: string;
  rest?: string;
};

export type ExerciseLog = {
  weight: string;
  reps: string;
  setsDone: string;
  rir: string;
  note: string;
  done: boolean;
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
  profile: Profile;
  goals: Goals;
  meals: Meal[];
  notifications: NotificationSettings;
  workouts: Workout[];
  weekPlan: WeekPlanItem[];
  dailyChecks: Record<string, DailyChecks>;
  exerciseLogs: Record<string, ExerciseLog>;
  progressEntries: ProgressEntry[];
};
