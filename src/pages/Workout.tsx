import { AlertTriangle, CalendarDays, CheckCircle2, HeartPulse, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { ExerciseCard } from '../components/ExerciseCard';
import { getWorkoutById } from '../data/workoutPlan';
import type { AppData, DailyChecks, Exercise, ExerciseLog, WeekPlanItem } from '../types';
import {
  createWorkoutSession,
  findPreviousExerciseLog,
  getWorkoutSessionId,
  getWorkoutSessionProgress,
} from '../utils/workoutSessions';

type WorkoutProps = {
  data: AppData;
  dateKey: string;
  todayChecks: DailyChecks;
  todayPlan: WeekPlanItem;
  onExerciseLogChange: (
    sessionId: string | undefined,
    workoutId: string,
    exerciseId: string,
    log: ExerciseLog
  ) => void;
  onFinishSession: (sessionId: string) => void;
  onStartSession: (workoutId: string) => void;
  onToggleCheck: (key: keyof Omit<DailyChecks, 'meals'>) => void;
};

export function Workout({
  data,
  dateKey,
  todayChecks,
  todayPlan,
  onExerciseLogChange,
  onFinishSession,
  onStartSession,
  onToggleCheck,
}: WorkoutProps) {
  const activeSession = data.activeWorkoutSessionId
    ? data.workoutSessions[data.activeWorkoutSessionId]
    : undefined;
  const activeWorkoutExists = Boolean(
    activeSession && data.workouts.some((workout) => workout.id === activeSession.workoutId)
  );
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(
    activeWorkoutExists && activeSession ? activeSession.workoutId : todayPlan.workoutId ?? data.workouts[0].id
  );
  const [viewedSessionId, setViewedSessionId] = useState<string | undefined>(
    activeWorkoutExists ? activeSession?.id : undefined
  );
  const selectedWorkout = getWorkoutById(selectedWorkoutId, data.workouts) ?? data.workouts[0];
  const currentDateSessionId = getWorkoutSessionId(selectedWorkout.id, dateKey);
  const viewedSession = viewedSessionId ? data.workoutSessions[viewedSessionId] : undefined;
  const matchingViewedSession = viewedSession?.workoutId === selectedWorkout.id ? viewedSession : undefined;
  const matchingActiveSession =
    activeSession?.workoutId === selectedWorkout.id && !activeSession.completedAt ? activeSession : undefined;
  const session = matchingViewedSession ?? matchingActiveSession ?? data.workoutSessions[currentDateSessionId];
  const displaySession =
    session ??
    createWorkoutSession(selectedWorkout, {
      dateKey,
      legacyExerciseLogs: data.exerciseLogs,
    });
  const sessionExercises: Exercise[] = session?.completedAt
    ? session.exerciseOrder.flatMap((exerciseId) => {
        const log = session.exerciseLogs[exerciseId];
        if (!log) return [];

        const currentExercise = selectedWorkout.exercises.find((exercise) => exercise.id === exerciseId);
        return [
          {
            id: exerciseId,
            name: log.exerciseName,
            sets: log.plannedSetCount,
            reps: log.targetReps,
            rest: currentExercise?.rest ?? '',
            rir: log.targetRir,
            note: currentExercise?.note,
            targets: currentExercise?.targets ?? [],
            unilateral: currentExercise?.unilateral,
            progressionType: currentExercise?.progressionType ?? ('large' as const),
          },
        ];
      })
    : selectedWorkout.exercises;
  const sessionProgress = getWorkoutSessionProgress(displaySession);
  const firstIncompleteExerciseIndex = sessionExercises.findIndex((exercise) => {
    const log = displaySession.exerciseLogs[exercise.id];
    return Boolean(log?.sets.slice(0, log.plannedSetCount).some((set) => !set.completed));
  });
  const isTodayWorkout = todayPlan.activityType === 'workout' && selectedWorkout.id === todayPlan.workoutId;

  useEffect(() => {
    if (!activeSession || !data.workouts.some((workout) => workout.id === activeSession.workoutId)) return;
    setSelectedWorkoutId(activeSession.workoutId);
    setViewedSessionId(activeSession.id);
  }, [activeSession, data.workouts]);

  const selectWorkout = (workoutId: string) => {
    setSelectedWorkoutId(workoutId);
    setViewedSessionId(undefined);
  };

  const scrollToExercises = () => {
    window.requestAnimationFrame(() => {
      document.getElementById('exercise-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleStartOrContinue = () => {
    if (!session) onStartSession(selectedWorkout.id);
    scrollToExercises();
  };

  return (
    <div className="space-y-4">
      <header className="pt-1">
        <p className="eyebrow">Modo treino</p>
        <h1 className="page-title mt-1">Vamos treinar, {data.profile.name}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Registre uma série por vez. O descanso começa quando você conclui cada linha.
        </p>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" aria-label="Escolher treino da semana">
        <div className="flex min-w-max gap-2">
          {data.weekPlan
            .filter((item) => item.activityType === 'workout' && item.workoutId)
            .map((item) => {
              const workout = getWorkoutById(item.workoutId, data.workouts);
              const isSelected = selectedWorkout.id === item.workoutId;
              return (
                <button
                  aria-pressed={isSelected}
                  className={`min-h-12 rounded-2xl border px-3.5 py-2 text-left transition ${
                    isSelected
                      ? 'border-lime-300/30 bg-lime-300/10 text-lime-100'
                      : 'border-white/10 bg-white/[0.035] text-slate-400'
                  }`}
                  key={`${item.dayIndex}-${item.workoutId}`}
                  onClick={() => item.workoutId && selectWorkout(item.workoutId)}
                  type="button"
                >
                  <span className="block text-[0.64rem] font-black uppercase tracking-wider">{item.dayLabel}</span>
                  <span className="mt-0.5 block max-w-36 truncate text-xs font-bold">{workout?.title}</span>
                </button>
              );
            })}
        </div>
      </div>

      <Card className="session-hero overflow-hidden border-lime-300/15 bg-gradient-to-br from-lime-300/[0.08] via-slate-900 to-slate-950" dataTour="workout-session">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{isTodayWorkout ? 'Treino de hoje' : selectedWorkout.dayLabel || 'Treino selecionado'}</p>
            <h2 className="mt-2 text-xl font-black leading-tight text-slate-50">{selectedWorkout.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{selectedWorkout.focus}</p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-300 text-slate-950">
            {session?.completedAt ? <CheckCircle2 size={22} aria-hidden="true" /> : <CalendarDays size={21} aria-hidden="true" />}
          </span>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-xs font-bold">
            <span className="text-slate-300">{sessionProgress.completedSetCount} de {sessionProgress.plannedSetCount} séries</span>
            <span className="tabular-nums text-lime-200">{sessionProgress.percentage}%</span>
          </div>
          <div
            aria-label="Progresso da sessão"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={sessionProgress.percentage}
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-950/70"
            role="progressbar"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-300" style={{ width: `${sessionProgress.percentage}%` }} />
          </div>
        </div>

        {session?.completedAt ? (
          <div className={`mt-4 flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-extrabold ${sessionProgress.percentage >= 60 ? 'border-lime-300/20 bg-lime-300/[0.08] text-lime-100' : 'border-amber-300/20 bg-amber-300/[0.08] text-amber-100'}`}>
            {sessionProgress.percentage >= 60 ? (
              <><CheckCircle2 size={18} aria-hidden="true" /> Sessão finalizada e XP registrado</>
            ) : (
              <><AlertTriangle size={18} aria-hidden="true" /> Sessão encerrada sem XP (mínimo de 60%)</>
            )}
          </div>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button className="primary-button w-full" onClick={handleStartOrContinue} type="button">
              <Play size={18} fill="currentColor" aria-hidden="true" /> {session ? 'Continuar treino' : 'Começar treino'}
            </button>
            <button
              className="secondary-button w-full"
              disabled={!session || sessionProgress.completedSetCount === 0}
              onClick={() => session && onFinishSession(session.id)}
              type="button"
            >
              <CheckCircle2 size={18} aria-hidden="true" /> Finalizar sessão
            </button>
          </div>
        )}

        {todayPlan.activityType === 'cardio' && todayPlan.cardio ? (
          <button
            className={`mt-3 flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm font-bold ${todayChecks.cardioDone ? 'border-teal-300/20 bg-teal-300/10 text-teal-100' : 'border-white/10 bg-white/[0.035] text-slate-300'}`}
            onClick={() => onToggleCheck('cardioDone')}
            type="button"
          >
            <span className="flex items-center gap-2"><HeartPulse size={18} aria-hidden="true" /> {todayPlan.cardio}</span>
            <span>{todayChecks.cardioDone ? 'Feito' : '+35 XP'}</span>
          </button>
        ) : null}
      </Card>

      <section className="scroll-mt-4 space-y-3" id="exercise-list" aria-labelledby="exercise-list-title">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="eyebrow">Execução</p>
            <h2 className="section-title mt-1" id="exercise-list-title">Séries do treino</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">{sessionExercises.length} exercícios</span>
        </div>
        {sessionExercises.map((exercise, index) => {
          const log = displaySession.exerciseLogs[exercise.id];
          const previousLog = findPreviousExerciseLog(data.workoutSessions, displaySession, exercise.id);
          return (
            <ExerciseCard
              defaultExpanded={index === (firstIncompleteExerciseIndex < 0 ? 0 : firstIncompleteExerciseIndex)}
              exercise={exercise}
              key={exercise.id}
              log={log}
              onChange={(exerciseId, nextLog) => onExerciseLogChange(session?.id, selectedWorkout.id, exerciseId, nextLog)}
              previousLog={previousLog}
              readOnly={Boolean(session?.completedAt)}
            />
          );
        })}
      </section>
    </div>
  );
}
