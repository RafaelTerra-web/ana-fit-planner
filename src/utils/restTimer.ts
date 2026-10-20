import type { RestTimer } from '../hooks/useRestTimer';

const REST_TIMER_STORAGE_KEY = 'ana-fit-planner:rest-timer:v1';
export const MAX_REST_SECONDS = 10 * 60;
export const REST_TIMER_RESTORE_GRACE_MS = 10 * 60 * 1000;

export type RestTimerDetails = Pick<RestTimer, 'exerciseId' | 'setId' | 'exerciseName' | 'durationSeconds'>;

export function getRestTimerStorageKey(userId?: string | null) {
  return `${REST_TIMER_STORAGE_KEY}:${userId ? `user:${userId}` : 'guest'}`;
}

export function normalizeRestDuration(seconds: number) {
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(MAX_REST_SECONDS, Math.max(1, Math.round(seconds))) : 0;
}

export function getRemainingRestSeconds(timer: Pick<RestTimer, 'endsAt'>, now = Date.now()) {
  if (!Number.isFinite(timer.endsAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

export function createRestTimer(details: RestTimerDetails, alarmId: string, now = Date.now()): RestTimer | null {
  const durationSeconds = normalizeRestDuration(details.durationSeconds);
  if (!durationSeconds || !Number.isFinite(now) || !details.exerciseId.trim() || !details.exerciseName.trim())
    return null;
  return {
    alarmId,
    exerciseId: details.exerciseId.trim().slice(0, 200),
    ...(details.setId ? { setId: details.setId } : {}),
    exerciseName: details.exerciseName.trim().slice(0, 160),
    durationSeconds,
    endsAt: now + durationSeconds * 1000,
  };
}

/** An adjusted deadline gets a new ID so a late cancellation cannot cancel its replacement. */
export function adjustRestTimer(timer: RestTimer, deltaSeconds: number, alarmId: string, now = Date.now()): RestTimer {
  if (!Number.isFinite(deltaSeconds) || !Number.isFinite(now) || Math.round(deltaSeconds) === 0) return timer;
  const endsAt = Math.max(now, Math.min(now + MAX_REST_SECONDS * 1000, timer.endsAt + Math.round(deltaSeconds) * 1000));
  if (endsAt === timer.endsAt) return timer;
  return {
    ...timer,
    alarmId,
    endsAt,
    durationSeconds: Math.min(
      MAX_REST_SECONDS,
      Math.max(1, Math.round(timer.durationSeconds + (endsAt - timer.endsAt) / 1000)),
    ),
  };
}

export function parseStoredRestTimer(raw: string | null, now = Date.now()): RestTimer | null {
  if (!raw || !Number.isFinite(now)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const parsed = value as Partial<RestTimer>;
    if (
      typeof parsed.alarmId !== 'string' ||
      !/^rest-[a-zA-Z0-9-]{8,80}$/.test(parsed.alarmId) ||
      typeof parsed.exerciseId !== 'string' ||
      !parsed.exerciseId.trim() ||
      parsed.exerciseId.length > 200 ||
      (parsed.setId !== undefined &&
        (typeof parsed.setId !== 'string' || !parsed.setId.trim() || parsed.setId.length > 256)) ||
      typeof parsed.exerciseName !== 'string' ||
      !parsed.exerciseName.trim() ||
      parsed.exerciseName.length > 160 ||
      typeof parsed.endsAt !== 'number' ||
      !Number.isFinite(parsed.endsAt) ||
      typeof parsed.durationSeconds !== 'number' ||
      !Number.isInteger(parsed.durationSeconds) ||
      parsed.durationSeconds < 1 ||
      parsed.durationSeconds > MAX_REST_SECONDS ||
      parsed.endsAt < now - REST_TIMER_RESTORE_GRACE_MS ||
      parsed.endsAt > now + parsed.durationSeconds * 1000
    )
      return null;
    return {
      alarmId: parsed.alarmId,
      exerciseId: parsed.exerciseId.trim(),
      ...(parsed.setId ? { setId: parsed.setId } : {}),
      exerciseName: parsed.exerciseName.trim(),
      endsAt: parsed.endsAt,
      durationSeconds: parsed.durationSeconds,
    };
  } catch {
    return null;
  }
}

export function formatRestTimer(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`;
}
