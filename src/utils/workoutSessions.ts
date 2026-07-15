import type { Exercise, ExerciseLog, ExerciseSetLog, LegacyExerciseLog, Workout, WorkoutSession } from '../types';

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SESSION_ID_PREFIX = 'workout-session';

export type CreateWorkoutSessionOptions = {
  date?: Date;
  dateKey?: string;
  startedAt?: string;
  legacyExerciseLogs?: Record<string, LegacyExerciseLog | undefined>;
};

export type WorkoutSessionProgress = {
  completedSetCount: number;
  plannedSetCount: number;
  percentage: number;
};

export type PreviousWorkoutSessionOptions = {
  completedOnly?: boolean;
};

type SessionReference = Pick<WorkoutSession, 'id' | 'workoutId' | 'dateKey' | 'startedAt'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toText(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function toNonEmptyText(value: unknown) {
  const text = toText(value).trim();
  return text || undefined;
}

function parseSetCount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const directValue = Number(value.replace(',', '.'));
  if (Number.isFinite(directValue)) {
    return Math.max(0, Math.round(directValue));
  }

  const firstNumber = value.match(/\d+/)?.[0];
  return firstNumber ? Number(firstNumber) : undefined;
}

function toBoolean(value: unknown) {
  return value === true || value === 1 || value === 'true';
}

function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);

  return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day;
}

function safeDate(date: Date) {
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function getLocalDateKey(date = new Date()) {
  const normalizedDate = safeDate(date);
  const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
  const day = String(normalizedDate.getDate()).padStart(2, '0');
  return `${normalizedDate.getFullYear()}-${month}-${day}`;
}

function getDateKeyFromSessionId(sessionId: string) {
  const prefix = `${SESSION_ID_PREFIX}:`;
  if (!sessionId.startsWith(prefix)) {
    return undefined;
  }

  const dateKey = sessionId.slice(prefix.length, prefix.length + 10);
  return isValidDateKey(dateKey) ? dateKey : undefined;
}

function normalizeDateKey(value: unknown, startedAt: unknown, sessionId: string) {
  if (isValidDateKey(value)) {
    return value;
  }

  const idDateKey = getDateKeyFromSessionId(sessionId);
  if (idDateKey) {
    return idDateKey;
  }

  const startedAtText = toNonEmptyText(startedAt);
  if (startedAtText) {
    const parsedDate = new Date(startedAtText);
    if (!Number.isNaN(parsedDate.getTime())) {
      return getLocalDateKey(parsedDate);
    }
  }

  return getLocalDateKey();
}

export function getWorkoutSessionId(workoutId: string, dateKey = getLocalDateKey()) {
  const normalizedWorkoutId = workoutId.trim() || 'workout';
  const normalizedDateKey = isValidDateKey(dateKey) ? dateKey : getLocalDateKey();
  return `${SESSION_ID_PREFIX}:${normalizedDateKey}:${normalizedWorkoutId}`;
}

function getSetId(exerciseId: string, setIndex: number) {
  return `${exerciseId}:set:${setIndex + 1}`;
}

function createSetLog(exerciseId: string, setIndex: number, reference?: LegacyExerciseLog): ExerciseSetLog {
  return {
    id: getSetId(exerciseId, setIndex),
    weight: toText(reference?.weight),
    reps: toText(reference?.reps),
    rir: toText(reference?.rir),
    completed: false,
  };
}

function hasLegacySetReference(legacyLog: LegacyExerciseLog | undefined) {
  return Boolean(
    legacyLog && (toText(legacyLog.weight).trim() || toText(legacyLog.reps).trim() || toText(legacyLog.rir).trim())
  );
}

export function createExerciseLog(exercise: Exercise, legacyLog?: LegacyExerciseLog): ExerciseLog {
  const plannedSetCount = parseSetCount(exercise.sets) ?? 0;
  const legacySetCount = parseSetCount(legacyLog?.setsDone) ?? 0;
  const setCount = Math.max(plannedSetCount, legacySetCount, hasLegacySetReference(legacyLog) ? 1 : 0);

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    targetReps: exercise.reps,
    targetRir: exercise.rir,
    plannedSetCount,
    sets: Array.from({ length: setCount }, (_, setIndex) => createSetLog(exercise.id, setIndex, legacyLog)),
    note: toText(legacyLog?.note),
  };
}

export function createWorkoutSession(workout: Workout, options: CreateWorkoutSessionOptions = {}): WorkoutSession {
  const date = safeDate(options.date ?? new Date());
  const dateKey = isValidDateKey(options.dateKey) ? options.dateKey : getLocalDateKey(date);
  const exerciseLogs = Object.fromEntries(
    workout.exercises.map((exercise) => [
      exercise.id,
      createExerciseLog(exercise, options.legacyExerciseLogs?.[exercise.id]),
    ])
  );
  const plannedSetCount = Object.values(exerciseLogs).reduce((total, log) => total + log.plannedSetCount, 0);

  return {
    id: getWorkoutSessionId(workout.id, dateKey),
    dateKey,
    workoutId: workout.id,
    workoutTitle: workout.title,
    startedAt: toNonEmptyText(options.startedAt) ?? date.toISOString(),
    plannedSetCount,
    exerciseOrder: workout.exercises.map((exercise) => exercise.id),
    exerciseLogs,
  };
}

function createUniqueSetId(candidate: unknown, exerciseId: string, setIndex: number, usedIds: Set<string>) {
  const baseId = toNonEmptyText(candidate) ?? getSetId(exerciseId, setIndex);
  let id = baseId;
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `${baseId}:${suffix}`;
    suffix += 1;
  }

  usedIds.add(id);
  return id;
}

function normalizeSetLog(value: unknown, exerciseId: string, setIndex: number, usedIds: Set<string>): ExerciseSetLog {
  const set = isRecord(value) ? value : {};

  return {
    id: createUniqueSetId(set.id, exerciseId, setIndex, usedIds),
    weight: toText(set.weight),
    reps: toText(set.reps),
    rir: toText(set.rir),
    completed: toBoolean(set.completed),
  };
}

function looksLikeLegacyLog(value: Record<string, unknown>) {
  return !Array.isArray(value.sets) && ['weight', 'reps', 'setsDone', 'rir', 'done'].some((key) => key in value);
}

function toLegacyLog(value: Record<string, unknown>): LegacyExerciseLog {
  return {
    weight: toText(value.weight),
    reps: toText(value.reps),
    setsDone: toText(value.setsDone),
    rir: toText(value.rir),
    note: toText(value.note),
    done: toBoolean(value.done),
  };
}

function createFallbackExercise(exerciseId: string, value: Record<string, unknown>, plannedSetCount: number): Exercise {
  return {
    id: exerciseId,
    name: toNonEmptyText(value.exerciseName) ?? exerciseId,
    sets: plannedSetCount,
    reps: toText(value.targetReps),
    rest: '',
    rir: toNonEmptyText(value.targetRir),
    targets: [],
    progressionType: 'large',
  };
}

function normalizeExerciseLog(value: unknown, fallbackExerciseId: string, plannedExercise?: Exercise): ExerciseLog {
  const log = isRecord(value) ? value : {};
  const exerciseId = toNonEmptyText(log.exerciseId) ?? fallbackExerciseId;
  const rawSets = Array.isArray(log.sets) ? log.sets : [];
  const explicitPlannedSetCount = parseSetCount(log.plannedSetCount);
  const legacyLog = looksLikeLegacyLog(log) ? toLegacyLog(log) : undefined;
  const plannedSetCount =
    explicitPlannedSetCount ?? parseSetCount(plannedExercise?.sets) ?? parseSetCount(legacyLog?.setsDone) ?? rawSets.length;

  if (legacyLog) {
    const exercise = plannedExercise ?? createFallbackExercise(exerciseId, log, plannedSetCount);
    const normalizedLegacyLog = createExerciseLog(exercise, legacyLog);
    return {
      ...normalizedLegacyLog,
      exerciseId,
      exerciseName: toNonEmptyText(log.exerciseName) ?? normalizedLegacyLog.exerciseName,
      targetReps: toText(log.targetReps, normalizedLegacyLog.targetReps),
      targetRir: toNonEmptyText(log.targetRir) ?? normalizedLegacyLog.targetRir,
      plannedSetCount,
      note: toText(log.note, normalizedLegacyLog.note),
    };
  }

  const usedIds = new Set<string>();
  const sets = rawSets.map((set, setIndex) => normalizeSetLog(set, exerciseId, setIndex, usedIds));
  const requiredSetCount = Math.max(plannedSetCount, sets.length);

  while (sets.length < requiredSetCount) {
    const setIndex = sets.length;
    sets.push({
      id: createUniqueSetId(undefined, exerciseId, setIndex, usedIds),
      weight: '',
      reps: '',
      rir: '',
      completed: false,
    });
  }

  return {
    exerciseId,
    exerciseName: toNonEmptyText(log.exerciseName) ?? plannedExercise?.name ?? exerciseId,
    targetReps: toText(log.targetReps, plannedExercise?.reps ?? ''),
    targetRir: toNonEmptyText(log.targetRir) ?? plannedExercise?.rir,
    plannedSetCount,
    sets,
    note: toText(log.note),
  };
}

function getEntries(value: unknown): Array<[string, unknown]> {
  if (Array.isArray(value)) {
    return value.map((item, index) => [String(index), item]);
  }

  return isRecord(value) ? Object.entries(value) : [];
}

function uniqueExerciseOrder(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  return value.reduce<string[]>((order, exerciseId) => {
    const id = toNonEmptyText(exerciseId);
    if (id && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
    return order;
  }, []);
}

function normalizeSession(value: unknown, storageKey: string, workoutsById: Map<string, Workout>): WorkoutSession | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const storedId = toNonEmptyText(value.id) ?? (storageKey && !/^\d+$/.test(storageKey) ? storageKey : '');
  const workoutIdFromSessionId = storedId.startsWith(`${SESSION_ID_PREFIX}:`)
    ? storedId.slice(`${SESSION_ID_PREFIX}:`.length + 11)
    : undefined;
  const workoutId = toNonEmptyText(value.workoutId) ?? toNonEmptyText(workoutIdFromSessionId);
  if (!workoutId) {
    return undefined;
  }

  const workout = workoutsById.get(workoutId);
  const dateKey = normalizeDateKey(value.dateKey, value.startedAt, storedId);
  const sessionId = storedId || getWorkoutSessionId(workoutId, dateKey);
  const exercisesById = new Map(workout?.exercises.map((exercise) => [exercise.id, exercise]) ?? []);
  const exerciseLogs: Record<string, ExerciseLog> = {};

  getEntries(value.exerciseLogs).forEach(([entryKey, rawLog]) => {
    const rawExerciseId = isRecord(rawLog) ? toNonEmptyText(rawLog.exerciseId) : undefined;
    const fallbackExerciseId = rawExerciseId ?? entryKey;
    const normalizedLog = normalizeExerciseLog(rawLog, fallbackExerciseId, exercisesById.get(fallbackExerciseId));
    exerciseLogs[normalizedLog.exerciseId] = exerciseLogs[normalizedLog.exerciseId]
      ? mergeExerciseLogs(exerciseLogs[normalizedLog.exerciseId], normalizedLog)
      : normalizedLog;
  });

  let exerciseOrder = uniqueExerciseOrder(value.exerciseOrder);
  if (!exerciseOrder.length) {
    exerciseOrder = Object.keys(exerciseLogs);
  }
  if (!exerciseOrder.length && workout) {
    exerciseOrder = workout.exercises.map((exercise) => exercise.id);
  }

  exerciseOrder.forEach((exerciseId) => {
    if (exerciseLogs[exerciseId]) {
      return;
    }

    const exercise = exercisesById.get(exerciseId);
    exerciseLogs[exerciseId] = exercise
      ? createExerciseLog(exercise)
      : normalizeExerciseLog({}, exerciseId);
  });

  Object.keys(exerciseLogs).forEach((exerciseId) => {
    if (!exerciseOrder.includes(exerciseId)) {
      exerciseOrder.push(exerciseId);
    }
  });

  const plannedFromLogs = exerciseOrder.reduce(
    (total, exerciseId) => total + (exerciseLogs[exerciseId]?.plannedSetCount ?? 0),
    0
  );
  const storedPlannedSetCount = parseSetCount(value.plannedSetCount) ?? 0;
  const completedAt = toNonEmptyText(value.completedAt);

  return {
    id: sessionId,
    dateKey,
    workoutId,
    workoutTitle: toNonEmptyText(value.workoutTitle) ?? workout?.title ?? workoutId,
    startedAt: toNonEmptyText(value.startedAt) ?? `${dateKey}T12:00:00.000Z`,
    ...(completedAt ? { completedAt } : {}),
    plannedSetCount: exerciseOrder.length ? plannedFromLogs : storedPlannedSetCount,
    exerciseOrder,
    exerciseLogs,
  };
}

function mergeSetLogs(first: ExerciseSetLog | undefined, second: ExerciseSetLog | undefined, fallbackId: string): ExerciseSetLog {
  return {
    id: first?.id || second?.id || fallbackId,
    weight: first?.weight || second?.weight || '',
    reps: first?.reps || second?.reps || '',
    rir: first?.rir || second?.rir || '',
    completed: Boolean(first?.completed || second?.completed),
  };
}

function mergeExerciseLogs(first: ExerciseLog, second: ExerciseLog): ExerciseLog {
  const setCount = Math.max(first.sets.length, second.sets.length);
  const sets = Array.from({ length: setCount }, (_, index) =>
    mergeSetLogs(first.sets[index], second.sets[index], getSetId(first.exerciseId, index))
  );

  return {
    exerciseId: first.exerciseId,
    exerciseName: first.exerciseName || second.exerciseName,
    targetReps: first.targetReps || second.targetReps,
    targetRir: first.targetRir || second.targetRir,
    plannedSetCount: Math.max(first.plannedSetCount, second.plannedSetCount),
    sets,
    note: first.note || second.note,
  };
}

function mergeSessions(first: WorkoutSession, second: WorkoutSession): WorkoutSession {
  const exerciseLogs = { ...first.exerciseLogs };
  Object.entries(second.exerciseLogs).forEach(([exerciseId, log]) => {
    exerciseLogs[exerciseId] = exerciseLogs[exerciseId] ? mergeExerciseLogs(exerciseLogs[exerciseId], log) : log;
  });

  const exerciseOrder = [...first.exerciseOrder];
  second.exerciseOrder.forEach((exerciseId) => {
    if (!exerciseOrder.includes(exerciseId)) {
      exerciseOrder.push(exerciseId);
    }
  });

  const plannedFromLogs = Object.values(exerciseLogs).reduce((total, log) => total + log.plannedSetCount, 0);
  const completedAt = first.completedAt || second.completedAt;

  return {
    ...first,
    workoutTitle: first.workoutTitle || second.workoutTitle,
    startedAt: first.startedAt < second.startedAt ? first.startedAt : second.startedAt,
    ...(completedAt ? { completedAt } : {}),
    plannedSetCount: Math.max(first.plannedSetCount, second.plannedSetCount, plannedFromLogs),
    exerciseOrder,
    exerciseLogs,
  };
}

export function reconcileWorkoutSession(session: WorkoutSession, workout: Workout): WorkoutSession {
  if (session.completedAt || session.workoutId !== workout.id) {
    return session;
  }

  const exerciseLogs = { ...session.exerciseLogs };
  const exerciseOrder = workout.exercises.map((exercise) => exercise.id);

  workout.exercises.forEach((exercise) => {
    const existingLog = exerciseLogs[exercise.id];
    if (!existingLog) {
      exerciseLogs[exercise.id] = createExerciseLog(exercise);
      return;
    }

    const plannedSetCount = parseSetCount(exercise.sets) ?? 0;
    const sets = existingLog.sets.map((set) => ({ ...set }));
    const usedIds = new Set(sets.map((set) => set.id));

    while (sets.length < plannedSetCount) {
      const setIndex = sets.length;
      sets.push({
        id: createUniqueSetId(undefined, exercise.id, setIndex, usedIds),
        weight: '',
        reps: '',
        rir: '',
        completed: false,
      });
    }

    exerciseLogs[exercise.id] = {
      ...existingLog,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      targetReps: exercise.reps,
      targetRir: exercise.rir,
      plannedSetCount,
      sets,
    };
  });

  const plannedSetCount = exerciseOrder.reduce(
    (total, exerciseId) => total + (exerciseLogs[exerciseId]?.plannedSetCount ?? 0),
    0
  );

  return {
    ...session,
    workoutTitle: workout.title,
    plannedSetCount,
    exerciseOrder,
    exerciseLogs,
  };
}

export function normalizeWorkoutSessions(value: unknown, workouts: Workout[] = []): Record<string, WorkoutSession> {
  const workoutsById = new Map(workouts.map((workout) => [workout.id, workout]));
  const sessions: Record<string, WorkoutSession> = {};

  getEntries(value).forEach(([storageKey, rawSession]) => {
    const session = normalizeSession(rawSession, storageKey, workoutsById);
    if (!session) {
      return;
    }

    const mergedSession = sessions[session.id] ? mergeSessions(sessions[session.id], session) : session;
    const workout = workoutsById.get(mergedSession.workoutId);
    sessions[session.id] = workout ? reconcileWorkoutSession(mergedSession, workout) : mergedSession;
  });

  return sessions;
}

export function getCompletedSetCount(log: ExerciseLog) {
  return log.sets
    .slice(0, Math.max(0, log.plannedSetCount))
    .reduce((total, set) => total + (set.completed ? 1 : 0), 0);
}

export function getWorkoutSessionProgress(session: WorkoutSession): WorkoutSessionProgress {
  const logs = session.exerciseOrder
    .map((exerciseId) => session.exerciseLogs[exerciseId])
    .filter((log): log is ExerciseLog => Boolean(log));
  const completedSetCount = logs.reduce((total, log) => total + getCompletedSetCount(log), 0);
  const plannedFromLogs = logs.reduce((total, log) => total + Math.max(0, log.plannedSetCount), 0);
  const plannedSetCount = logs.length ? plannedFromLogs : Math.max(0, session.plannedSetCount);
  const percentage = plannedSetCount > 0 ? Math.min(100, Math.round((completedSetCount / plannedSetCount) * 100)) : 0;

  return { completedSetCount, plannedSetCount, percentage };
}

function getSessionTimestamp(session: SessionReference) {
  const startedAt = Date.parse(session.startedAt);
  if (Number.isFinite(startedAt)) {
    return startedAt;
  }

  const dateKeyTimestamp = Date.parse(`${session.dateKey}T12:00:00.000Z`);
  return Number.isFinite(dateKeyTimestamp) ? dateKeyTimestamp : 0;
}

function getPreviousSessions(
  sessions: Record<string, WorkoutSession>,
  currentSession: SessionReference,
  options: PreviousWorkoutSessionOptions,
  sameWorkoutOnly: boolean
) {
  const currentTimestamp = getSessionTimestamp(currentSession);

  return Object.values(sessions)
    .filter((session) => {
      if (session.id === currentSession.id || getSessionTimestamp(session) >= currentTimestamp) {
        return false;
      }
      if (sameWorkoutOnly && session.workoutId !== currentSession.workoutId) {
        return false;
      }
      return !options.completedOnly || Boolean(session.completedAt);
    })
    .sort((first, second) => getSessionTimestamp(second) - getSessionTimestamp(first));
}

export function findPreviousWorkoutSession(
  sessions: Record<string, WorkoutSession>,
  currentSession: SessionReference,
  options: PreviousWorkoutSessionOptions = {}
) {
  return getPreviousSessions(sessions, currentSession, options, true)[0];
}

function hasExerciseReference(log: ExerciseLog) {
  return Boolean(
    log.note.trim() || log.sets.some((set) => set.completed || set.weight.trim() || set.reps.trim() || set.rir.trim())
  );
}

export function findPreviousExerciseLog(
  sessions: Record<string, WorkoutSession>,
  currentSession: SessionReference,
  exerciseId: string,
  options: PreviousWorkoutSessionOptions = {}
) {
  for (const session of getPreviousSessions(sessions, currentSession, options, false)) {
    const log = session.exerciseLogs[exerciseId];
    if (log && hasExerciseReference(log)) {
      return log;
    }
  }

  return undefined;
}
