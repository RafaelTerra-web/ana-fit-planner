import { weekPlan as defaultWeekPlan, workouts as defaultWorkouts } from '../data/workoutPlan';
import type { AppData, Exercise, ExerciseTarget, MuscleGroup, WeekPlanItem, Workout } from '../types';

export const muscleOptions: Array<{ value: MuscleGroup; label: string }> = [
  { value: 'glutes', label: 'Gluteos' },
  { value: 'quadriceps', label: 'Quadriceps' },
  { value: 'hamstrings', label: 'Posteriores' },
  { value: 'back', label: 'Costas' },
  { value: 'chest', label: 'Peito' },
  { value: 'shoulders', label: 'Ombros' },
  { value: 'arms', label: 'Bracos' },
  { value: 'core', label: 'Core' },
  { value: 'calves', label: 'Panturrilhas' },
];

export const volumeTargets: Record<MuscleGroup, { min: number; max: number }> = {
  glutes: { min: 8, max: 12 },
  quadriceps: { min: 8, max: 12 },
  hamstrings: { min: 6, max: 10 },
  back: { min: 6, max: 10 },
  chest: { min: 4, max: 8 },
  shoulders: { min: 4, max: 8 },
  arms: { min: 4, max: 8 },
  core: { min: 4, max: 8 },
  calves: { min: 4, max: 8 },
};

export type VolumeStatus = {
  level: 'none' | 'low' | 'good' | 'watch' | 'high';
  label: string;
  message: string;
  tone: 'slate' | 'teal' | 'amber' | 'rose';
};

const validMuscles = new Set<MuscleGroup>(muscleOptions.map((option) => option.value));

function cloneWorkouts(source: Workout[]) {
  return source.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      targets: exercise.targets.map((target) => ({ ...target })),
    })),
  }));
}

function cloneWeekPlan(source: WeekPlanItem[]) {
  return source.map((item) => ({ ...item }));
}

export function getMuscleLabel(muscle: MuscleGroup) {
  return muscleOptions.find((option) => option.value === muscle)?.label ?? muscle;
}

export function formatVolume(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

export function formatSetLabel(exercise: Exercise) {
  const suffix = exercise.sets === 1 ? 'serie' : 'series';
  return `${exercise.sets} ${suffix}${exercise.unilateral ? ' por perna' : ''}`;
}

export function calculateWeeklyVolume(workouts: Workout[], weekPlan: WeekPlanItem[]) {
  const volume = Object.fromEntries(muscleOptions.map((option) => [option.value, 0])) as Record<MuscleGroup, number>;
  const workoutsById = new Map(workouts.map((workout) => [workout.id, workout]));

  weekPlan.forEach((day) => {
    if (!day.workoutId) {
      return;
    }

    const workout = workoutsById.get(day.workoutId);
    workout?.exercises.forEach((exercise) => {
      exercise.targets.forEach((target) => {
        volume[target.muscle] += exercise.sets * (target.role === 'primary' ? 1 : 0.5);
      });
    });
  });

  return volume;
}

export function getVolumeStatus(muscle: MuscleGroup, volume: number): VolumeStatus {
  const target = volumeTargets[muscle];

  if (volume <= 0) {
    return {
      level: 'none',
      label: 'Sem volume',
      message: 'Sem series planejadas para a semana.',
      tone: 'slate',
    };
  }

  if (volume > 15) {
    return {
      level: 'high',
      label: 'Volume alto',
      message: 'Acima de 15 series semanais. Em cutting, monitore recuperacao e performance.',
      tone: 'rose',
    };
  }

  if (volume < target.min) {
    return {
      level: 'low',
      label: 'Baixo',
      message: `Abaixo da faixa alvo de ${target.min}-${target.max} series.`,
      tone: 'amber',
    };
  }

  if (volume <= target.max) {
    return {
      level: 'good',
      label: 'Bom para cutting',
      message: `Dentro da faixa alvo de ${target.min}-${target.max} series.`,
      tone: 'teal',
    };
  }

  return {
    level: 'watch',
    label: 'Acima do alvo',
    message: `Acima da faixa alvo de ${target.min}-${target.max}, mas ainda abaixo do alerta alto.`,
    tone: 'amber',
  };
}

function parseSetCount(value: Exercise['sets'] | string | number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const firstNumber = String(value).match(/\d+/)?.[0];
  return firstNumber ? Number(firstNumber) : 1;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferTargets(name: string): ExerciseTarget[] {
  const text = normalizeText(name);

  if (text.includes('leg press') || text.includes('extensora') || text.includes('agachamento') || text.includes('bulgar')) {
    return [
      { muscle: 'quadriceps', role: 'primary' },
      { muscle: 'glutes', role: 'secondary' },
    ];
  }

  if (text.includes('stiff') || text.includes('rdl') || text.includes('flexora')) {
    return [
      { muscle: 'hamstrings', role: 'primary' },
      { muscle: 'glutes', role: 'secondary' },
    ];
  }

  if (text.includes('hip thrust') || text.includes('coice') || text.includes('abdutora') || text.includes('gluteo')) {
    return [{ muscle: 'glutes', role: 'primary' }];
  }

  if (text.includes('puxada') || text.includes('remada')) {
    return [{ muscle: 'back', role: 'primary' }];
  }

  if (text.includes('supino')) {
    return [{ muscle: 'chest', role: 'primary' }];
  }

  if (text.includes('ombro') || text.includes('elevacao lateral')) {
    return [{ muscle: 'shoulders', role: 'primary' }];
  }

  if (text.includes('prancha') || text.includes('abdominal')) {
    return [{ muscle: 'core', role: 'primary' }];
  }

  return [{ muscle: 'glutes', role: 'primary' }];
}

function normalizeTargets(targets: ExerciseTarget[] | undefined, exerciseName: string) {
  const normalizedTargets = targets
    ?.filter((target) => validMuscles.has(target.muscle))
    .map((target) => ({
      muscle: target.muscle,
      role: (target.role === 'secondary' ? 'secondary' : 'primary') as ExerciseTarget['role'],
    }));

  return normalizedTargets?.length ? normalizedTargets : inferTargets(exerciseName);
}

function normalizeExercise(exercise: Exercise, index: number): Exercise {
  const legacyExercise = exercise as Exercise & { sets: number | string; targets?: ExerciseTarget[] };
  const name = legacyExercise.name || `Exercicio ${index + 1}`;

  return {
    ...legacyExercise,
    id: legacyExercise.id || `exercise-${index + 1}`,
    name,
    sets: parseSetCount(legacyExercise.sets),
    reps: legacyExercise.reps || '8 a 12 reps',
    rest: legacyExercise.rest || '90 s',
    targets: normalizeTargets(legacyExercise.targets, name),
    unilateral: Boolean(legacyExercise.unilateral),
    progressionType: legacyExercise.progressionType === 'isolation' ? 'isolation' : 'large',
  };
}

function normalizeWorkouts(input: Workout[] | undefined) {
  const source = Array.isArray(input) && input.length ? input : defaultWorkouts;

  return source.map((workout, workoutIndex) => ({
    ...workout,
    id: workout.id || `workout-${workoutIndex + 1}`,
    title: workout.title || `Treino ${workoutIndex + 1}`,
    shortTitle: workout.shortTitle || workout.title || `Treino ${workoutIndex + 1}`,
    focus: workout.focus || 'Ajuste o foco deste treino.',
    dayLabel: workout.dayLabel || '',
    exercises: Array.isArray(workout.exercises) ? workout.exercises.map(normalizeExercise) : [],
  }));
}

function normalizeWeekPlan(input: WeekPlanItem[] | undefined) {
  const source = Array.isArray(input) && input.length ? input : defaultWeekPlan;
  return source.map((item) => ({ ...item }));
}

export function normalizeWorkoutData(data: AppData): AppData {
  return {
    ...data,
    workouts: normalizeWorkouts(data.workouts),
    weekPlan: normalizeWeekPlan(data.weekPlan),
  };
}

export function createDefaultWorkouts() {
  return cloneWorkouts(defaultWorkouts);
}

export function createDefaultWeekPlan() {
  return cloneWeekPlan(defaultWeekPlan);
}
