import { BellRing, Minus, Plus, TimerReset, X } from 'lucide-react';
import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/authContext';
import { RestTimerContext, type RestTimer } from '../hooks/useRestTimer';
import {
  cancelRemoteRestAlarm,
  primeRestAlarm,
  scheduleRemoteRestAlarm,
  triggerRestCompleteAlarm,
} from '../utils/restAlarm';
import {
  adjustRestTimer,
  createRestTimer,
  formatRestTimer,
  getRemainingRestSeconds,
  getRestTimerStorageKey,
  MAX_REST_SECONDS,
  parseStoredRestTimer,
  type RestTimerDetails,
} from '../utils/restTimer';
import './rest-timer.css';

type FinishedRest = Pick<RestTimer, 'alarmId' | 'exerciseName'>;

function createAlarmId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `rest-${crypto.randomUUID()}`;
  return `rest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStoredTimer(storageKey: string): RestTimer | null {
  try {
    return parseStoredRestTimer(window.localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

function persistTimer(storageKey: string, timer: RestTimer | null) {
  try {
    if (timer) window.localStorage.setItem(storageKey, JSON.stringify(timer));
    else window.localStorage.removeItem(storageKey);
  } catch {
    // Private browsing and full storage must not interrupt an in-memory timer.
  }
}

function ScopedRestTimerProvider({ children, storageKey }: PropsWithChildren<{ storageKey: string }>) {
  const [timer, setTimer] = useState<RestTimer | null>(() => readStoredTimer(storageKey));
  const timerRef = useRef(timer);
  const mountedRef = useRef(false);
  const [remainingSeconds, setRemainingSeconds] = useState(() => (timer ? getRemainingRestSeconds(timer) : 0));
  const [finishedRest, setFinishedRest] = useState<FinishedRest | null>(null);

  const scheduleTimer = useCallback((nextTimer: RestTimer) => {
    const isCurrent = () => mountedRef.current && timerRef.current?.alarmId === nextTimer.alarmId;
    void primeRestAlarm()
      .then(async (endpoint) => {
        if (!isCurrent()) return;
        await scheduleRemoteRestAlarm(nextTimer, endpoint);
        // The permission/subscription request may finish after the rest was replaced.
        if (!isCurrent()) await cancelRemoteRestAlarm(nextTimer.alarmId);
      })
      .catch(() => undefined);
  }, []);

  const replaceTimer = useCallback(
    (nextTimer: RestTimer | null) => {
      const previousTimer = timerRef.current;
      timerRef.current = nextTimer;
      if (previousTimer && previousTimer.alarmId !== nextTimer?.alarmId)
        void cancelRemoteRestAlarm(previousTimer.alarmId);
      persistTimer(storageKey, nextTimer);
      setTimer(nextTimer);
      setRemainingSeconds(nextTimer ? getRemainingRestSeconds(nextTimer) : 0);
    },
    [storageKey],
  );

  const skipRest = useCallback(() => {
    replaceTimer(null);
    setFinishedRest(null);
  }, [replaceTimer]);

  const startRest = useCallback(
    (details: RestTimerDetails) => {
      const nextTimer = createRestTimer(details, createAlarmId());
      if (!nextTimer) return;
      setFinishedRest(null);
      replaceTimer(nextTimer);
      scheduleTimer(nextTimer);
    },
    [replaceTimer, scheduleTimer],
  );

  const adjustRest = useCallback(
    (deltaSeconds: number) => {
      const current = timerRef.current;
      if (!current || getRemainingRestSeconds(current) === 0) return;
      const nextTimer = adjustRestTimer(current, deltaSeconds, createAlarmId());
      if (nextTimer === current) return;
      replaceTimer(nextTimer);
      if (getRemainingRestSeconds(nextTimer) > 0) scheduleTimer(nextTimer);
    },
    [replaceTimer, scheduleTimer],
  );

  useEffect(() => {
    mountedRef.current = true;
    const restoredTimer = timerRef.current;
    if (restoredTimer && getRemainingRestSeconds(restoredTimer) > 0) {
      // Never reuse a restored alarm ID: it may already have a cancellation on the server.
      const refreshedTimer = { ...restoredTimer, alarmId: createAlarmId() };
      replaceTimer(refreshedTimer);
      // Restoring the app must not open a new notification permission prompt.
      if ('Notification' in window && Notification.permission === 'granted') scheduleTimer(refreshedTimer);
    }
    return () => {
      mountedRef.current = false;
      // A different account must not inherit or schedule this account's running alarm.
      if (timerRef.current) void cancelRemoteRestAlarm(timerRef.current.alarmId);
    };
  }, [replaceTimer, scheduleTimer]);

  useEffect(() => {
    if (!timer) return;
    const updateTimer = () => {
      if (timerRef.current?.alarmId !== timer.alarmId) return;
      const now = Date.now();
      const nextRemaining = getRemainingRestSeconds(timer, now);
      setRemainingSeconds(nextRemaining);
      if (nextRemaining > 0) return;
      replaceTimer(null);
      setFinishedRest({ alarmId: timer.alarmId, exerciseName: timer.exerciseName });
      void triggerRestCompleteAlarm(timer, now - timer.endsAt < 5000);
    };
    updateTimer();
    const interval = window.setInterval(updateTimer, 250);
    // Browser intervals can be suspended while the screen is locked.
    document.addEventListener('visibilitychange', updateTimer);
    window.addEventListener('focus', updateTimer);
    window.addEventListener('pageshow', updateTimer);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', updateTimer);
      window.removeEventListener('focus', updateTimer);
      window.removeEventListener('pageshow', updateTimer);
    };
  }, [replaceTimer, timer]);

  useEffect(() => {
    if (!finishedRest) return;
    const timeout = window.setTimeout(() => setFinishedRest(null), 15000);
    return () => window.clearTimeout(timeout);
  }, [finishedRest]);

  const value = useMemo(
    () => ({ timer, remainingSeconds, startRest, adjustRest, skipRest }),
    [adjustRest, remainingSeconds, skipRest, startRest, timer],
  );
  const remainingRatio = timer ? Math.min(100, (remainingSeconds / timer.durationSeconds) * 100) : 0;

  return (
    <RestTimerContext.Provider value={value}>
      {children}
      {timer && remainingSeconds > 0 ? (
        <aside className="rest-timer" aria-label={`Descanso de ${timer.exerciseName}`}>
          <div className="rest-timer-heading">
            <span className="rest-timer-icon">
              <TimerReset size={21} aria-hidden="true" />
            </span>
            <span className="rest-timer-exercise">
              <span>Recupere o fôlego</span>
              <strong>{timer.exerciseName}</strong>
            </span>
            <span
              className="rest-timer-clock"
              role="timer"
              aria-live="off"
              aria-label={`${remainingSeconds} segundos de descanso restantes`}
            >
              {formatRestTimer(remainingSeconds)}
            </span>
          </div>
          <div className="rest-timer-progress" aria-hidden="true">
            <span style={{ width: `${remainingRatio}%` }} />
          </div>
          <div className="rest-timer-controls">
            <button type="button" onClick={() => adjustRest(-15)} aria-label="Diminuir descanso em 15 segundos">
              <Minus size={15} aria-hidden="true" /> 15 s
            </button>
            <button
              type="button"
              onClick={() => adjustRest(30)}
              disabled={remainingSeconds >= MAX_REST_SECONDS}
              aria-label="Aumentar descanso em 30 segundos"
            >
              <Plus size={15} aria-hidden="true" /> 30 s
            </button>
            <button className="rest-timer-skip" type="button" onClick={skipRest}>
              Pular descanso
            </button>
          </div>
        </aside>
      ) : null}
      {finishedRest ? (
        <aside className="rest-timer-complete" role="alert" aria-atomic="true">
          <span className="rest-timer-complete-icon">
            <BellRing size={24} aria-hidden="true" />
          </span>
          <span className="rest-timer-complete-copy">
            <strong>Descanso acabou!</strong>
            <span>{finishedRest.exerciseName} · próxima série</span>
          </span>
          <button type="button" onClick={() => setFinishedRest(null)} aria-label="Fechar alerta de descanso">
            <X size={21} aria-hidden="true" />
          </button>
        </aside>
      ) : null}
    </RestTimerContext.Provider>
  );
}

export function RestTimerProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const storageKey = getRestTimerStorageKey(user?.id);
  return (
    <ScopedRestTimerProvider key={storageKey} storageKey={storageKey}>
      {children}
    </ScopedRestTimerProvider>
  );
}
