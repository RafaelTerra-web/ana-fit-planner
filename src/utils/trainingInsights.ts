import type { ExerciseLog, ExerciseSetLog, WorkoutSession } from '../types';

export type TrainingPeriod = 7 | 30 | 90 | 365;

export type TrainingMetrics = {
  completedWorkouts: number;
  trainingDays: number;
  completedSets: number;
  validSets: number;
  volumeKg: number;
  durationMinutes: number;
  timedWorkouts: number;
};

export type ExerciseHistoryPoint = {
  sessionId: string;
  dateKey: string;
  workoutTitle: string;
  bestWeightKg: number;
  bestWeightReps: number;
  completedSets: number;
  volumeKg: number;
};

export type TrainingRecord = {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  previousWeightKg: number;
};

export type SessionTrainingSummary = {
  id: string;
  dateKey: string;
  workoutTitle: string;
  completedSets: number;
  validSets: number;
  volumeKg: number;
  durationMinutes: number | null;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    completedSets: number;
    volumeKg: number;
    bestWeightKg: number | null;
    bestWeightReps: number | null;
    note: string;
  }>;
  records: TrainingRecord[];
};

export type ExerciseTrainingInsight = {
  exerciseId: string;
  exerciseName: string;
  history: ExerciseHistoryPoint[];
  allTimeBestKg: number;
  loadChangeKg: number | null;
  completedSets: number;
  volumeKg: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Calendar arithmetic uses UTC after extracting the local date, so daylight-saving
// changes cannot create missing or duplicate days in a rolling period.
function dateOrdinal(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day)
    return null;
  return timestamp / DAY_MS;
}

function ordinalKey(ordinal: number) {
  return new Date(ordinal * DAY_MS).toISOString().slice(0, 10);
}

function parseNumber(value: string) {
  const text = value.trim().replace(',', '.');
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) return null;
  const result = Number(text);
  return Number.isFinite(result) ? result : null;
}

export function getValidTrainingSet(set: ExerciseSetLog) {
  if (!set.completed) return null;
  const weightKg = parseNumber(set.weight);
  const reps = parseNumber(set.reps);
  if (
    weightKg === null ||
    reps === null ||
    reps <= 0 ||
    !Number.isSafeInteger(reps) ||
    !Number.isFinite(weightKg * reps)
  )
    return null;
  return { weightKg, reps, volumeKg: weightKg * reps };
}

function getExerciseSummary(log: ExerciseLog) {
  const completedSets = log.sets.filter((set) => set.completed).length;
  const validSets = log.sets.map(getValidTrainingSet).filter((set): set is NonNullable<typeof set> => set !== null);
  const best = validSets.reduce<(typeof validSets)[number] | null>((current, set) => {
    return !current || set.weightKg > current.weightKg || (set.weightKg === current.weightKg && set.reps > current.reps)
      ? set
      : current;
  }, null);
  return {
    exerciseId: log.exerciseId,
    exerciseName: log.exerciseName,
    completedSets,
    validSetCount: validSets.length,
    volumeKg: validSets.reduce((total, set) => total + set.volumeKg, 0),
    bestWeightKg: best?.weightKg ?? null,
    bestWeightReps: best?.reps ?? null,
    note: log.note,
  };
}

export function getSessionTrainingSummary(session: WorkoutSession): SessionTrainingSummary {
  const orderedIds = [...new Set([...session.exerciseOrder, ...Object.keys(session.exerciseLogs)])];
  const exercises = orderedIds
    .map((id) => session.exerciseLogs[id])
    .filter((log): log is ExerciseLog => Boolean(log))
    .map(getExerciseSummary)
    .filter((log) => log.completedSets > 0);
  const start = Date.parse(session.startedAt);
  const end = Date.parse(session.completedAt ?? '');
  const durationMinutes = Number.isFinite(start) && Number.isFinite(end) && end >= start ? (end - start) / 60000 : null;

  return {
    id: session.id,
    dateKey: session.dateKey,
    workoutTitle: session.workoutTitle,
    completedSets: exercises.reduce((total, exercise) => total + exercise.completedSets, 0),
    validSets: exercises.reduce((total, exercise) => total + exercise.validSetCount, 0),
    volumeKg: exercises.reduce((total, exercise) => total + exercise.volumeKg, 0),
    durationMinutes,
    exercises,
    records: [],
  };
}

function metrics(sessions: SessionTrainingSummary[]): TrainingMetrics {
  return {
    completedWorkouts: sessions.length,
    trainingDays: new Set(sessions.map((session) => session.dateKey)).size,
    completedSets: sessions.reduce((total, session) => total + session.completedSets, 0),
    validSets: sessions.reduce((total, session) => total + session.validSets, 0),
    volumeKg: sessions.reduce((total, session) => total + session.volumeKg, 0),
    durationMinutes: sessions.reduce((total, session) => total + (session.durationMinutes ?? 0), 0),
    timedWorkouts: sessions.filter((session) => session.durationMinutes !== null).length,
  };
}

export function getTrainingInsights(
  sessions: Record<string, WorkoutSession>,
  options: { days?: TrainingPeriod; now?: Date } = {},
) {
  const days = options.days ?? 30;
  const now = options.now ?? new Date();
  const today = dateOrdinal(dateKey(now))!;
  const start = today - days + 1;
  const previousStart = start - days;
  const historyByExercise = new Map<string, ExerciseHistoryPoint[]>();
  const bestByExercise = new Map<string, number>();
  const exerciseNames = new Map<string, string>();
  const finished = Object.values(sessions)
    .filter((session) => {
      const day = dateOrdinal(session.dateKey);
      const completedAt = Date.parse(session.completedAt ?? '');
      return day !== null && day <= today && Number.isFinite(completedAt) && completedAt <= now.getTime();
    })
    .sort(
      (first, second) => first.dateKey.localeCompare(second.dateKey) || first.startedAt.localeCompare(second.startedAt),
    );

  const summaries = finished.map((session) => {
    const summary = getSessionTrainingSummary(session);
    summary.exercises.forEach((exercise) => {
      if (exercise.bestWeightKg === null || exercise.bestWeightReps === null) return;
      exerciseNames.set(exercise.exerciseId, exercise.exerciseName);
      const previousBest = bestByExercise.get(exercise.exerciseId);
      if (previousBest !== undefined && exercise.bestWeightKg > previousBest) {
        summary.records.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          weightKg: exercise.bestWeightKg,
          reps: exercise.bestWeightReps,
          previousWeightKg: previousBest,
        });
      }
      bestByExercise.set(exercise.exerciseId, Math.max(previousBest ?? 0, exercise.bestWeightKg));
      const history = historyByExercise.get(exercise.exerciseId) ?? [];
      history.push({
        sessionId: session.id,
        dateKey: session.dateKey,
        workoutTitle: session.workoutTitle,
        bestWeightKg: exercise.bestWeightKg,
        bestWeightReps: exercise.bestWeightReps,
        completedSets: exercise.completedSets,
        volumeKg: exercise.volumeKg,
      });
      historyByExercise.set(exercise.exerciseId, history);
    });
    return summary;
  });

  const currentSessions = summaries.filter((session) => session.dateKey >= ordinalKey(start));
  const previousSessions = summaries.filter(
    (session) => session.dateKey >= ordinalKey(previousStart) && session.dateKey < ordinalKey(start),
  );
  const exercises: ExerciseTrainingInsight[] = [];
  historyByExercise.forEach((allHistory, exerciseId) => {
    const history = allHistory.filter((point) => point.dateKey >= ordinalKey(start));
    if (!history.length) return;
    exercises.push({
      exerciseId,
      exerciseName: exerciseNames.get(exerciseId) ?? exerciseId,
      history,
      allTimeBestKg: bestByExercise.get(exerciseId) ?? 0,
      loadChangeKg: history.length > 1 ? history[history.length - 1].bestWeightKg - history[0].bestWeightKg : null,
      completedSets: history.reduce((total, point) => total + point.completedSets, 0),
      volumeKg: history.reduce((total, point) => total + point.volumeKg, 0),
    });
  });
  exercises.sort(
    (first, second) =>
      second.history.length - first.history.length || first.exerciseName.localeCompare(second.exerciseName, 'pt-BR'),
  );

  return {
    days,
    startDateKey: ordinalKey(start),
    endDateKey: ordinalKey(today),
    current: metrics(currentSessions),
    previous: metrics(previousSessions),
    dailyActivity: Array.from({ length: days }, (_, index) => {
      const key = ordinalKey(start + index);
      const dailySessions = currentSessions.filter((session) => session.dateKey === key);
      return {
        dateKey: key,
        workouts: dailySessions.length,
        volumeKg: dailySessions.reduce((total, session) => total + session.volumeKg, 0),
      };
    }),
    exercises,
    sessions: [...currentSessions].reverse(),
    recordCount: currentSessions.reduce((total, session) => total + session.records.length, 0),
  };
}
