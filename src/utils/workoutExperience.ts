import type { ExerciseLog, ExerciseSetLog, Workout, WorkoutSession } from '../types';

export function normalizeWorkoutSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

/** Use the lower end of a prescribed range, or add explicit minutes + seconds. */
export function parseRestSeconds(value: string) {
  const normalized = value.toLowerCase().replace(',', '.');
  const mixed = normalized.match(/(\d+(?:\.\d+)?)\s*min\w*\s*(?:e\s*)?(\d+(?:\.\d+)?)\s*s/);
  if (mixed) return Math.round(Number(mixed[1]) * 60 + Number(mixed[2]));
  const clock = normalized.match(/^(\d+):([0-5]\d)$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const number = Number(normalized.match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
  return Math.max(0, Math.round(number * (/min/.test(normalized) ? 60 : 1)));
}

export function hasSetValues(set?: ExerciseSetLog) {
  return Boolean(set && (set.weight.trim() || set.reps.trim() || set.rir.trim()));
}

export function validateSetCompletion(set: ExerciseSetLog) {
  const weight = set.weight.trim().replace(',', '.');
  const reps = set.reps.trim();
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(weight) || !Number.isFinite(Number(weight)))
    return 'Informe a carga em kg. Para peso corporal, use 0.';
  if (!/^\d+$/.test(reps) || !Number.isSafeInteger(Number(reps)) || Number(reps) < 1)
    return 'Informe um número inteiro de repetições maior que zero.';
  return null;
}

export function getRepeatSetReference(log: ExerciseLog, index: number, previousLog?: ExerciseLog) {
  const valid = (set?: ExerciseSetLog): set is ExerciseSetLog => Boolean(set && !validateSetCompletion(set));
  const earlierSet =
    log.sets
      .slice(0, index)
      .reverse()
      .find((set) => set.completed && valid(set)) ?? log.sets.slice(0, index).reverse().find(valid);
  if (earlierSet) return earlierSet;
  const correspondingPrevious = previousLog?.sets[index];
  return valid(correspondingPrevious) && correspondingPrevious.completed
    ? correspondingPrevious
    : previousLog?.sets
        .slice()
        .reverse()
        .find((set) => set.completed && valid(set));
}

export function adjustSetValue(value: string, delta: number, field: 'weight' | 'reps') {
  const parsed = Number(value.trim().replace(',', '.'));
  const current = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  const next = Math.max(0, Math.round((current + delta) * 100) / 100);
  return String(field === 'reps' ? Math.round(next) : next).replace('.', ',');
}

export function fillEmptySetsFromHistory(log: ExerciseLog, previousLog?: ExerciseLog): ExerciseLog {
  if (!previousLog) return log;
  let changed = false;
  const sets = log.sets.map((set, index) => {
    if (set.completed || set.weight.trim() || set.reps.trim()) return set;
    const reference = getRepeatSetReference({ ...log, sets: [] }, index, previousLog);
    if (!reference) return set;
    changed = true;
    return { ...set, weight: reference.weight, reps: reference.reps, rir: set.rir || reference.rir };
  });
  return changed ? { ...log, sets } : log;
}

export function estimateWorkoutMinutes(workout: Workout) {
  const seconds = workout.exercises.reduce((total, exercise) => {
    const sets = Math.max(0, exercise.sets);
    return total + sets * 45 + Math.max(0, sets - 1) * parseRestSeconds(exercise.rest) + 60;
  }, 0);
  return Math.max(1, Math.round(seconds / 60));
}

export function getSessionElapsedSeconds(session: Pick<WorkoutSession, 'startedAt' | 'completedAt'>, now = Date.now()) {
  const start = Date.parse(session.startedAt);
  const end = session.completedAt ? Date.parse(session.completedAt) : now;
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.floor((end - start) / 1000)) : 0;
}

export function formatSessionDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = String(safeSeconds % 60).padStart(2, '0');
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}`
    : `${String(minutes).padStart(2, '0')}:${remainder}`;
}

export function getSessionVolume(session: WorkoutSession) {
  return session.exerciseOrder.reduce((total, exerciseId) => {
    return (
      total +
      (session.exerciseLogs[exerciseId]?.sets ?? []).reduce((exerciseTotal, set) => {
        if (!set.completed) return exerciseTotal;
        if (validateSetCompletion(set)) return exerciseTotal;
        return exerciseTotal + Number(set.weight.trim().replace(',', '.')) * Number(set.reps.trim());
      }, 0)
    );
  }, 0);
}
