import { exerciseLibrary, type LibraryExercise } from '../data/exerciseLibrary';
import type { Exercise, MuscleGroup, Workout } from '../types';
import { normalizeWorkoutSearch } from './workoutExperience';

const aliases: Record<string, string> = {
  'hip thrust moderado': 'Hip thrust com barra',
  'stiff / rdl': 'Stiff / RDL com barra',
  abdutora: 'Abdução de quadril',
  flexora: 'Cadeira flexora',
  extensora: 'Cadeira extensora',
  'puxada alta': 'Puxada frontal',
  'supino maquina ou halteres': 'Supino reto com halteres',
  'supino inclinado maquina ou halteres': 'Supino inclinado',
  'desenvolvimento de ombro': 'Desenvolvimento com halteres',
  'abdominal prancha': 'Prancha',
  'bulgaro com passada neutra': 'Agachamento búlgaro',
  'coice no cabo': 'Coice na polia',
  'triceps polia': 'Tríceps na polia',
  'biceps martelo': 'Rosca martelo',
};
const byName = new Map(exerciseLibrary.map((exercise) => [normalizeWorkoutSearch(exercise.name), exercise]));

export function findCatalogExercise(
  exercise: Pick<Exercise, 'name' | 'catalogId'>,
): LibraryExercise | undefined {
  if (exercise.catalogId) {
    const found = exerciseLibrary.find((item) => item.catalogId === exercise.catalogId);
    if (found) return found;
  }
  const normalized = normalizeWorkoutSearch(exercise.name);
  return byName.get(normalized) ?? byName.get(normalizeWorkoutSearch(aliases[normalized] ?? ''));
}

export function createCatalogExercise(template: LibraryExercise, id: string): Exercise {
  return {
    id,
    catalogId: template.catalogId,
    name: template.name,
    equipment: template.equipment,
    sets: template.sets,
    reps: template.reps,
    rest: template.rest,
    targets: template.targets.map((target) => ({ ...target })),
    unilateral: template.unilateral,
    progressionType: template.progressionType,
  };
}

export const lowerMuscles = new Set<MuscleGroup>(['glutes', 'quadriceps', 'hamstrings', 'calves']);
export type WorkoutFocus = 'lower' | 'upper' | 'core' | 'full';
export const focusLabels: Record<WorkoutFocus, string> = {
  lower: 'Inferiores',
  upper: 'Superiores',
  core: 'Core',
  full: 'Corpo inteiro',
};

export function getWorkoutFocus(workout: Pick<Workout, 'exercises'>): {
  group: WorkoutFocus;
  muscle: MuscleGroup;
} {
  const counts = new Map<MuscleGroup, number>();
  for (const exercise of workout.exercises)
    for (const target of exercise.targets) {
      counts.set(
        target.muscle,
        (counts.get(target.muscle) ?? 0) + exercise.sets * (target.role === 'primary' ? 1 : 0.3),
      );
    }
  const ordered = [...counts].sort((a, b) => b[1] - a[1]);
  const muscle = ordered[0]?.[0] ?? 'core';
  const lower = [...counts].reduce((total, [item, count]) => total + (lowerMuscles.has(item) ? count : 0), 0);
  const upper = [...counts].reduce(
    (total, [item, count]) => total + (!lowerMuscles.has(item) && item !== 'core' ? count : 0),
    0,
  );
  const group =
    lower && upper && Math.min(lower, upper) / Math.max(lower, upper) > 0.6
      ? 'full'
      : muscle === 'core'
        ? 'core'
        : lower > upper
          ? 'lower'
          : 'upper';
  return { group, muscle };
}

export function normalizePlannedWeight(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) && number >= 0 && number <= 1000
    ? Math.round(number * 100) / 100
    : undefined;
}
