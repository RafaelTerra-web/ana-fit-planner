export type AppTab = 'today' | 'workout' | 'diet' | 'progress' | 'settings';

export type ThemeName = 'dark';

export type FitnessObjective = 'body-recomposition' | 'fat-loss' | 'muscle-gain' | 'performance';

export type EatingStyle = 'omnivore' | 'flexitarian' | 'vegetarian' | 'vegan' | 'pescatarian';

export type Profile = {
  name: string;
  age?: number;
  heightCm: number;
  weightKg: number;
  trainingDays: number;
  cardioDays: number;
  preferredFoods: string[];
  avoidedFoods: string[];
  theme: ThemeName;
  onboardingCompleted?: boolean;
  objective?: FitnessObjective;
  eatingStyle?: EatingStyle;
  mealsPerDay?: 3 | 4 | 5 | 6;
};

export type Goals = {
  calories: number;
  protein: number;
  fat: number;
  waterLiters: number;
};

export type NutritionRange = {
  min: number;
  max: number;
};

export type NutritionPlanList = {
  id: string;
  title: string;
  items: string[];
};

export type AssignedNutritionPlan = {
  id: string;
  revision: number;
  title: string;
  objective: string;
  mealStrategy: 'fixed' | 'flexible';
  mealWeightBasis?: string;
  portionGuidance?: string[];
  context: {
    ageYears?: number;
    sex?: 'female' | 'male' | 'other';
    heightCm?: number;
    weightKg?: number;
    trainingDaysPerWeek?: number;
    restDaysPerWeek?: number;
    cardioDaysPerWeek?: number;
    avoidedFoods?: string[];
    notes?: string[];
  };
  targets?: {
    estimatedMaintenanceCalories?: NutritionRange;
    trainingDayCalories?: NutritionRange;
    restDayCalories?: NutritionRange;
    minimumCaloriesWithoutProfessional?: number;
    proteinGrams?: NutritionRange;
    carbohydrateGrams?: NutritionRange;
    fatGrams?: NutritionRange;
  };
  macroEstimateNote?: string;
  restDayAdjustments?: string[];
  substitutions?: NutritionPlanList[];
  guidance?: NutritionPlanList[];
  disclaimer?: string;
  assignedAt: string;
};

export type MealOption = {
  id: string;
  title: string;
  items: string[];
  note?: string;
};

export type MealDayApplicability = 'training' | 'rest' | 'both';

export type Meal = {
  id: string;
  title: string;
  time: string;
  items: string[];
  optional?: boolean;
  appliesTo?: MealDayApplicability;
  options?: MealOption[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
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
  assignedNutritionPlan?: AssignedNutritionPlan;
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
