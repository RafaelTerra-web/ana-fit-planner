import { BellRing, TimerReset, X } from 'lucide-react';
import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { RestTimerContext, type RestTimer } from '../hooks/useRestTimer';
import {
  cancelRemoteRestAlarm,
  primeRestAlarm,
  scheduleRemoteRestAlarm,
  triggerRestCompleteAlarm,
} from '../utils/restAlarm';

const REST_TIMER_STORAGE_KEY = 'ana-fit-planner:rest-timer:v1';

type FinishedRest = Pick<RestTimer, 'alarmId' | 'exerciseName'>;

function createAlarmId() {
  if ('randomUUID' in crypto) return `rest-${crypto.randomUUID()}`;
  return `rest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStoredTimer(): RestTimer | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(REST_TIMER_STORAGE_KEY) ?? 'null') as Partial<RestTimer> | null;
    if (
      parsed &&
      typeof parsed.alarmId === 'string' &&
      typeof parsed.exerciseId === 'string' &&
      typeof parsed.exerciseName === 'string' &&
      typeof parsed.endsAt === 'number' &&
      typeof parsed.durationSeconds === 'number' &&
      parsed.endsAt > Date.now() - 10 * 60 * 1_000
    ) {
      return parsed as RestTimer;
    }
  } catch {
    // Invalid timers are discarded without affecting workout data.
  }

  return null;
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RestTimerProvider({ children }: PropsWithChildren) {
  const [timer, setTimer] = useState<RestTimer | null>(readStoredTimer);
  const [remainingSeconds, setRemainingSeconds] = useState(() => (timer ? Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1_000)) : 0));
  const [finishedRest, setFinishedRest] = useState<FinishedRest | null>(null);

  const skipRest = useCallback(() => {
    if (timer) void cancelRemoteRestAlarm(timer.alarmId);
    window.localStorage.removeItem(REST_TIMER_STORAGE_KEY);
    setTimer(null);
    setRemainingSeconds(0);
  }, [timer]);

  const startRest = useCallback(
    ({ exerciseId, exerciseName, durationSeconds }: { exerciseId: string; exerciseName: string; durationSeconds: number }) => {
      if (durationSeconds <= 0) return;
      if (timer) void cancelRemoteRestAlarm(timer.alarmId);

      setFinishedRest(null);
      const nextTimer: RestTimer = {
        alarmId: createAlarmId(),
        exerciseId,
        exerciseName,
        durationSeconds,
        endsAt: Date.now() + durationSeconds * 1_000,
      };

      window.localStorage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify(nextTimer));
      setTimer(nextTimer);
      setRemainingSeconds(durationSeconds);

      void primeRestAlarm()
        .then((subscriptionEndpoint) => scheduleRemoteRestAlarm(nextTimer, subscriptionEndpoint))
        .catch(() => undefined);
    },
    [timer]
  );

  useEffect(() => {
    if (!timer) return;

    const updateTimer = () => {
      const nextRemaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1_000));
      setRemainingSeconds(nextRemaining);
      if (nextRemaining > 0) return;

      const lateBy = Date.now() - timer.endsAt;
      window.localStorage.removeItem(REST_TIMER_STORAGE_KEY);
      setTimer(null);
      setFinishedRest({ alarmId: timer.alarmId, exerciseName: timer.exerciseName });
      void cancelRemoteRestAlarm(timer.alarmId);
      void triggerRestCompleteAlarm(timer, lateBy < 5_000);
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (!finishedRest) return;
    const timeout = window.setTimeout(() => setFinishedRest(null), 15_000);
    return () => window.clearTimeout(timeout);
  }, [finishedRest]);

  const value = useMemo(() => ({ timer, remainingSeconds, startRest, skipRest }), [remainingSeconds, skipRest, startRest, timer]);

  return (
    <RestTimerContext.Provider value={value}>
      {children}

      {timer && remainingSeconds > 0 ? (
        <aside
          className="fixed left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-lime-300/30 bg-slate-950/95 px-3 py-2.5 shadow-[0_16px_55px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.4rem)', maxWidth: '28rem', width: 'calc(100% - 1.5rem)' }}
          role="timer"
          aria-live="polite"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-300/12 text-lime-300">
            <TimerReset size={20} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.67rem] font-extrabold uppercase tracking-widest text-slate-500">Descanso</span>
            <span className="block truncate text-sm font-extrabold text-slate-100">{timer.exerciseName}</span>
          </span>
          <span className="font-mono text-lg font-black tabular-nums text-lime-200">{formatTimer(remainingSeconds)}</span>
          <button className="min-h-10 px-1 text-xs font-extrabold text-slate-400" type="button" onClick={skipRest}>Pular</button>
        </aside>
      ) : null}

      {finishedRest ? (
        <aside
          className="fixed left-1/2 top-0 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-lime-200/40 bg-lime-300 p-3 text-slate-950 shadow-[0_18px_70px_rgba(190,242,100,0.32)] animate-[pulse_1s_ease-in-out_2]"
          style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)', maxWidth: '28rem', width: 'calc(100% - 1.5rem)' }}
          role="alert"
          aria-live="assertive"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-lime-300">
            <BellRing size={23} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-black">Descanso acabou!</span>
            <span className="block truncate text-xs font-bold text-slate-800">{finishedRest.exerciseName} · próxima série</span>
          </span>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/10" type="button" onClick={() => setFinishedRest(null)} aria-label="Fechar alerta">
            <X size={20} aria-hidden="true" />
          </button>
        </aside>
      ) : null}
    </RestTimerContext.Provider>
  );
}
