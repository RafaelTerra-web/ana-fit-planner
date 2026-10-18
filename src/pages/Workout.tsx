import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dumbbell,
  HeartPulse,
  Moon,
  Pencil,
  Play,
  Search,
  Sparkles,
  Timer,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CardioJournal } from '../components/CardioJournal';
import { ExerciseCard } from '../components/ExerciseCard';
import { getWorkoutById } from '../data/workoutPlan';
import type { AppData, CardioEntry, DailyChecks, Exercise, ExerciseLog, WeekPlanItem } from '../types';
import {
  estimateWorkoutMinutes,
  formatSessionDuration,
  getSessionElapsedSeconds,
  getSessionVolume,
  normalizeWorkoutSearch,
} from '../utils/workoutExperience';
import { getMuscleLabel } from '../utils/workoutVolume';
import {
  createWorkoutSession,
  findPreviousExerciseLog,
  getWorkoutSessionId,
  getWorkoutSessionProgress,
} from '../utils/workoutSessions';
import '../workout-refresh.css';

type WorkoutProps = {
  data: AppData;
  dateKey: string;
  todayChecks: DailyChecks;
  todayPlan: WeekPlanItem;
  initialWorkoutId?: string;
  onExerciseLogChange: (sessionId: string | undefined, workoutId: string, exerciseId: string, log: ExerciseLog) => void;
  onFinishSession: (sessionId: string) => void;
  onStartSession: (workoutId: string) => void;
  onToggleCheck: (key: keyof Omit<DailyChecks, 'meals'>) => void;
  onManagePlan?: () => void;
  onAddCardio?: (entry: CardioEntry) => void;
  onRemoveCardio?: (id: string) => void;
};

const dayAbbreviations: Record<number, string> = {
  0: 'DOM',
  1: 'SEG',
  2: 'TER',
  3: 'QUA',
  4: 'QUI',
  5: 'SEX',
  6: 'SÁB',
};
const volumeFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

export function Workout({
  data,
  dateKey,
  todayChecks,
  todayPlan,
  initialWorkoutId,
  onExerciseLogChange,
  onFinishSession,
  onStartSession,
  onToggleCheck,
  onManagePlan,
  onAddCardio,
  onRemoveCardio,
}: WorkoutProps) {
  const activeSession = data.activeWorkoutSessionId ? data.workoutSessions[data.activeWorkoutSessionId] : undefined;
  const activeWorkoutExists = Boolean(
    activeSession &&
    !activeSession.completedAt &&
    data.workouts.some((workout) => workout.id === activeSession.workoutId),
  );
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(
    initialWorkoutId ??
      (activeWorkoutExists && activeSession ? activeSession.workoutId : (todayPlan.workoutId ?? data.workouts[0].id)),
  );
  const [viewedSessionId, setViewedSessionId] = useState<string | undefined>(
    activeWorkoutExists && (!initialWorkoutId || initialWorkoutId === activeSession?.workoutId)
      ? activeSession?.id
      : undefined,
  );
  const [routineSearch, setRoutineSearch] = useState('');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showFinishReview, setShowFinishReview] = useState(false);
  const [now, setNow] = useState(Date.now());
  const finishDialogRef = useRef<HTMLDialogElement>(null);
  const finishTriggerRef = useRef<HTMLButtonElement>(null);
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
  const firstIncompleteExerciseIndex = sessionExercises.findIndex((exercise) =>
    displaySession.exerciseLogs[exercise.id]?.sets
      .slice(0, displaySession.exerciseLogs[exercise.id].plannedSetCount)
      .some((set) => !set.completed),
  );
  const isTodayWorkout = todayPlan.activityType === 'workout' && selectedWorkout.id === todayPlan.workoutId;
  const completedExerciseCount = sessionExercises.filter((exercise) => {
    const log = displaySession.exerciseLogs[exercise.id];
    return log && log.plannedSetCount > 0 && log.sets.slice(0, log.plannedSetCount).every((set) => set.completed);
  }).length;
  const volume = getSessionVolume(displaySession);
  const elapsed = session ? formatSessionDuration(getSessionElapsedSeconds(session, now)) : null;
  const normalizedRoutineSearch = normalizeWorkoutSearch(routineSearch);
  const filteredWorkouts = data.workouts.filter((workout) =>
    normalizeWorkoutSearch(
      [
        workout.title,
        workout.focus,
        ...workout.exercises.flatMap((exercise) => [
          exercise.name,
          ...exercise.targets.map((target) => getMuscleLabel(target.muscle)),
        ]),
      ].join(' '),
    ).includes(normalizedRoutineSearch),
  );
  const filteredExercises = sessionExercises.filter((exercise) =>
    normalizeWorkoutSearch(
      [exercise.name, ...exercise.targets.map((target) => getMuscleLabel(target.muscle))].join(' '),
    ).includes(normalizeWorkoutSearch(exerciseSearch)),
  );
  const todayDate = new Date(`${dateKey}T12:00:00`);
  const monday = new Date(todayDate);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const orderedDays = [...data.weekPlan].sort(
    (first, second) => ((first.dayIndex + 6) % 7) - ((second.dayIndex + 6) % 7),
  );

  useEffect(() => {
    if (!activeWorkoutExists || !activeSession || (initialWorkoutId && initialWorkoutId !== activeSession.workoutId))
      return;
    setSelectedWorkoutId(activeSession.workoutId);
    setViewedSessionId(activeSession.id);
    // Only a newly active session should change the selected routine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id, activeWorkoutExists, initialWorkoutId]);

  useEffect(() => {
    if (!session?.id || session.completedAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [session?.id, session?.completedAt]);

  useEffect(() => {
    if (showFinishReview) finishDialogRef.current?.showModal();
    else if (finishDialogRef.current?.open) finishDialogRef.current.close();
  }, [showFinishReview]);

  const selectWorkout = (workoutId: string, shouldScroll = false) => {
    setSelectedWorkoutId(workoutId);
    setViewedSessionId(undefined);
    setExerciseSearch('');
    if (shouldScroll)
      window.requestAnimationFrame(() =>
        document.getElementById('workout-session')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
  };

  const scrollToExercises = () =>
    window.requestAnimationFrame(() =>
      document.getElementById('exercise-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  const closeFinishReview = () => {
    setShowFinishReview(false);
    finishTriggerRef.current?.focus();
  };

  return (
    <div className="af-workout-page">
      <header className="af-workout-page-header">
        <div>
          <p className="af-kicker">Seu espaço de evolução</p>
          <h1>
            Meus treinos<span className="af-title-dot">.</span>
          </h1>
          <p>Um plano seu. Uma série de cada vez.</p>
        </div>
        {onManagePlan ? (
          <button
            className="af-icon-button"
            type="button"
            onClick={onManagePlan}
            aria-label="Criar ou editar meus treinos"
          >
            <Pencil size={19} aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <div className="af-week-strip" aria-label="Sua programação semanal">
        {orderedDays.map((item) => {
          const date = new Date(monday);
          date.setDate(monday.getDate() + ((item.dayIndex + 6) % 7));
          const isToday = item.dayIndex === todayDate.getDay();
          const isSelected = item.activityType === 'workout' && item.workoutId === selectedWorkout.id;
          const content = (
            <>
              <span>{dayAbbreviations[item.dayIndex]}</span>
              <strong>{date.getDate()}</strong>
              <span className={`af-day-marker ${item.activityType}`}>
                <span className="sr-only">
                  {item.activityType === 'workout' ? 'Treino' : item.activityType === 'cardio' ? 'Cardio' : 'Descanso'}
                </span>
              </span>
            </>
          );
          return item.workoutId && item.activityType === 'workout' ? (
            <button
              className={`af-week-day ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
              key={item.dayIndex}
              onClick={() => selectWorkout(item.workoutId!, true)}
              type="button"
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${item.dayLabel}, ${date.getDate()}: ${item.title}`}
            >
              {content}
            </button>
          ) : (
            <div
              className={`af-week-day ${isToday ? 'is-today' : ''}`}
              key={item.dayIndex}
              aria-current={isToday ? 'date' : undefined}
              title={`${item.dayLabel}: ${item.title}`}
            >
              {content}
            </div>
          );
        })}
      </div>

      {activeWorkoutExists && activeSession && activeSession.workoutId !== selectedWorkout.id ? (
        <button
          className="af-resume-banner"
          type="button"
          onClick={() => {
            selectWorkout(activeSession.workoutId);
            setViewedSessionId(activeSession.id);
          }}
        >
          <span className="af-live-dot" />
          <span>
            Você tem um treino em andamento
            <strong>{activeSession.workoutTitle}</strong>
          </span>
          <ArrowRight size={19} aria-hidden="true" />
        </button>
      ) : null}

      <section className="af-routines-section" aria-labelledby="routine-library-title">
        <div className="af-section-heading">
          <h2 id="routine-library-title">Sua rotina</h2>
          {onManagePlan ? (
            <button className="af-text-button" type="button" onClick={onManagePlan}>
              Organizar <ChevronRight size={15} aria-hidden="true" />
            </button>
          ) : (
            <span>{data.workouts.length} treinos</span>
          )}
        </div>
        <label className="af-search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Buscar treino, exercício ou músculo"
            placeholder="Buscar treino, exercício ou músculo"
            value={routineSearch}
            onChange={(event) => setRoutineSearch(event.target.value)}
          />
          {routineSearch ? (
            <button type="button" onClick={() => setRoutineSearch('')} aria-label="Limpar busca de treinos">
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <div className="af-routine-grid">
          {filteredWorkouts.map((workout) => {
            const index = data.workouts.findIndex((item) => item.id === workout.id);
            const assignedDays = orderedDays
              .filter((item) => item.workoutId === workout.id)
              .map((item) => dayAbbreviations[item.dayIndex]);
            const isSelected = selectedWorkout.id === workout.id;
            const isActive = activeWorkoutExists && activeSession?.workoutId === workout.id;
            const isDone = Boolean(data.workoutSessions[getWorkoutSessionId(workout.id, dateKey)]?.completedAt);
            return (
              <button
                className={`af-routine-card af-routine-tone-${index % 4} ${isSelected ? 'is-selected' : ''}`}
                key={workout.id}
                type="button"
                onClick={() => selectWorkout(workout.id, true)}
                aria-pressed={isSelected}
                aria-label={`Ver treino ${workout.title}`}
              >
                <span className="af-routine-top">
                  <span className="af-routine-icon">
                    <Dumbbell size={23} aria-hidden="true" />
                  </span>
                  {isActive ? (
                    <span className="af-routine-state">Em andamento</span>
                  ) : isDone ? (
                    <CheckCircle2 size={18} aria-label="Concluído hoje" />
                  ) : (
                    <ChevronRight size={17} aria-hidden="true" />
                  )}
                </span>
                <strong>{workout.title}</strong>
                <span className="af-routine-meta">
                  {workout.exercises.length} exercícios · ~{estimateWorkoutMinutes(workout)} min
                </span>
                <span className="af-routine-days">
                  {assignedDays.length ? assignedDays.join(' · ') : 'Sem dia fixo'}
                  {isSelected ? <Check size={14} aria-hidden="true" /> : null}
                </span>
              </button>
            );
          })}
        </div>
        {!filteredWorkouts.length ? (
          <div className="af-empty-state">
            <Search size={25} aria-hidden="true" />
            <strong>Nenhum treino encontrado</strong>
            <p>Tente outro nome ou grupo muscular.</p>
            <button className="af-text-button" type="button" onClick={() => setRoutineSearch('')}>
              Ver todos os treinos
            </button>
          </div>
        ) : null}
      </section>

      {todayPlan.activityType !== 'workout' ? (
        <div className="af-recovery-note">
          {todayPlan.activityType === 'cardio' ? (
            <HeartPulse size={20} aria-hidden="true" />
          ) : (
            <Moon size={20} aria-hidden="true" />
          )}
          <div>
            <strong>
              {todayPlan.activityType === 'cardio' ? 'Hoje também tem cardio' : 'Hoje é dia de recuperar'}
            </strong>
            <p>{todayPlan.cardio || todayPlan.rest || 'Seu próximo treino fica pronto aqui quando você quiser.'}</p>
          </div>
          {todayPlan.activityType === 'cardio' ? (
            <button
              className={todayChecks.cardioDone ? 'is-done' : ''}
              type="button"
              onClick={() => onToggleCheck('cardioDone')}
              aria-pressed={todayChecks.cardioDone}
            >
              {todayChecks.cardioDone ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <HeartPulse size={17} aria-hidden="true" />
              )}
              {todayChecks.cardioDone ? 'Feito' : 'Marcar'}
            </button>
          ) : null}
        </div>
      ) : null}

      <section
        className="af-session-hero"
        data-tour="workout-session"
        id="workout-session"
        aria-labelledby="selected-workout-title"
      >
        <div className="af-session-top">
          <span className={`af-session-label ${session?.completedAt ? 'is-completed' : ''}`}>
            {session?.completedAt ? (
              <>
                <CheckCircle2 size={14} aria-hidden="true" /> Sessão concluída
              </>
            ) : session ? (
              <>
                <span className="af-live-dot" /> Em andamento
              </>
            ) : isTodayWorkout ? (
              'Treino de hoje'
            ) : (
              'Treino selecionado'
            )}
          </span>
          {elapsed ? (
            <span className="af-session-time" aria-label={`Duração da sessão: ${elapsed}`}>
              <Timer size={14} aria-hidden="true" />
              {elapsed}
            </span>
          ) : null}
        </div>
        <h2 id="selected-workout-title">{session?.completedAt ? session.workoutTitle : selectedWorkout.title}</h2>
        <p className="af-session-focus">
          {selectedWorkout.focus || 'Encontre sua carga, mantenha o ritmo e acompanhe cada série.'}
        </p>
        <div className="af-session-metrics">
          <span>
            <Dumbbell size={16} aria-hidden="true" />
            <strong>{sessionExercises.length}</strong> exercícios
          </span>
          <span>
            <CheckCircle2 size={16} aria-hidden="true" />
            <strong>{sessionProgress.plannedSetCount}</strong> séries
          </span>
          <span>
            <Clock3 size={16} aria-hidden="true" />~{estimateWorkoutMinutes(selectedWorkout)} min
          </span>
        </div>
        <div className="af-session-progress-label">
          <span>
            {sessionProgress.completedSetCount} de {sessionProgress.plannedSetCount} séries concluídas
          </span>
          <strong>{sessionProgress.percentage}%</strong>
        </div>
        <div
          aria-label="Progresso da sessão"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={sessionProgress.percentage}
          className="af-session-progress"
          role="progressbar"
        >
          <div style={{ width: `${sessionProgress.percentage}%` }} />
        </div>
        {session?.completedAt ? (
          <div className={`af-session-result ${sessionProgress.percentage < 60 ? 'is-partial' : ''}`}>
            {sessionProgress.percentage >= 60 ? (
              <Sparkles size={18} aria-hidden="true" />
            ) : (
              <AlertTriangle size={18} aria-hidden="true" />
            )}
            <span>
              <strong>
                {sessionProgress.percentage >= 60 ? 'Mais um passo na sua evolução.' : 'Seu registro foi salvo.'}
              </strong>
              {volume > 0 ? `${volumeFormatter.format(volume)} kg de volume registrado · ` : ''}
              {sessionProgress.percentage >= 60 ? 'XP registrado.' : 'Menos de 60% das séries: sem XP nesta sessão.'}
            </span>
          </div>
        ) : (
          <div className="af-session-actions">
            <button
              className="af-primary-button"
              type="button"
              onClick={() => {
                if (!session) onStartSession(selectedWorkout.id);
                scrollToExercises();
              }}
            >
              <Play size={17} fill="currentColor" aria-hidden="true" />
              {session ? 'Continuar treino' : 'Começar treino'}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            {session ? (
              <button
                className="af-secondary-button"
                disabled={sessionProgress.completedSetCount === 0}
                onClick={() => setShowFinishReview(true)}
                ref={finishTriggerRef}
                type="button"
              >
                <CheckCircle2 size={17} aria-hidden="true" /> Finalizar
              </button>
            ) : null}
          </div>
        )}
      </section>

      <section className="af-exercise-section" id="exercise-list" aria-labelledby="exercise-list-title">
        <div className="af-section-heading">
          <div>
            <p className="af-kicker">Na prática</p>
            <h2 id="exercise-list-title">Séries do treino</h2>
          </div>
          <span>
            {completedExerciseCount}/{sessionExercises.length} completos
          </span>
        </div>
        <p className="af-section-description">
          Digite carga e repetições. Use 0 kg para peso corporal. Toque em ✓ para iniciar o descanso.
        </p>
        {sessionExercises.length > 4 ? (
          <label className="af-search af-exercise-search">
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="Buscar exercício neste treino"
              placeholder="Encontrar exercício neste treino"
              value={exerciseSearch}
              onChange={(event) => setExerciseSearch(event.target.value)}
            />
            {exerciseSearch ? (
              <button type="button" onClick={() => setExerciseSearch('')} aria-label="Limpar busca de exercícios">
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </label>
        ) : null}
        <div className="af-exercise-list">
          {filteredExercises.map((exercise) => {
            const index = sessionExercises.findIndex((item) => item.id === exercise.id);
            const log = displaySession.exerciseLogs[exercise.id];
            if (!log) return null;
            return (
              <ExerciseCard
                defaultExpanded={
                  Boolean(exerciseSearch) ||
                  index === (firstIncompleteExerciseIndex < 0 ? 0 : firstIncompleteExerciseIndex)
                }
                exercise={exercise}
                key={`${displaySession.id}-${exercise.id}-${Boolean(exerciseSearch)}`}
                log={log}
                onChange={(exerciseId, nextLog) =>
                  onExerciseLogChange(session?.id, selectedWorkout.id, exerciseId, nextLog)
                }
                previousLog={findPreviousExerciseLog(data.workoutSessions, displaySession, exercise.id)}
                readOnly={Boolean(session?.completedAt)}
              />
            );
          })}
        </div>
        {!filteredExercises.length ? (
          <div className="af-empty-state">
            <Search size={23} aria-hidden="true" />
            <strong>Exercício não encontrado</strong>
            <button className="af-text-button" type="button" onClick={() => setExerciseSearch('')}>
              Mostrar todos
            </button>
          </div>
        ) : null}
        {session && !session.completedAt && sessionProgress.completedSetCount > 0 ? (
          <button className="af-finish-footer" type="button" onClick={() => setShowFinishReview(true)}>
            <CheckCircle2 size={20} aria-hidden="true" />
            <span>
              Terminou por hoje?<strong>Finalizar e ver resumo</strong>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        ) : null}
      </section>

      {onAddCardio && onRemoveCardio ? (
        <CardioJournal entries={data.cardioEntries ?? []} onAddEntry={onAddCardio} onRemoveEntry={onRemoveCardio} />
      ) : null}

      <dialog
        className="af-finish-dialog"
        ref={finishDialogRef}
        onCancel={(event) => {
          event.preventDefault();
          closeFinishReview();
        }}
        onClose={() => setShowFinishReview(false)}
        aria-labelledby="finish-session-title"
      >
        <div className="af-finish-dialog-body">
          <button className="af-dialog-close" type="button" onClick={closeFinishReview} aria-label="Voltar ao treino">
            <X size={20} aria-hidden="true" />
          </button>
          <span className="af-finish-icon">
            <CheckCircle2 size={30} aria-hidden="true" />
          </span>
          <p className="af-kicker">Seu esforço fica registrado</p>
          <h2 id="finish-session-title">Finalizar por hoje?</h2>
          <p>Confira sua sessão de {selectedWorkout.shortTitle || selectedWorkout.title} antes de salvar.</p>
          <div className="af-finish-stats">
            <span>
              <strong>
                {sessionProgress.completedSetCount}
                <small>/{sessionProgress.plannedSetCount}</small>
              </strong>
              Séries feitas
            </span>
            <span>
              <strong>{elapsed ?? '00:00'}</strong>Duração
            </span>
            <span>
              <strong>
                {volumeFormatter.format(volume)}
                <small> kg</small>
              </strong>
              Volume registrado
            </span>
          </div>
          {sessionProgress.percentage < 100 ? (
            <p className="af-finish-warning">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>
                Faltam {sessionProgress.plannedSetCount - sessionProgress.completedSetCount} séries planejadas.
                {sessionProgress.percentage < 60
                  ? ' A sessão será salva sem XP, pois o mínimo é 60%.'
                  : ' Você já atingiu o mínimo de 60% para receber XP.'}
              </span>
            </p>
          ) : (
            <p className="af-finish-celebrate">
              <Sparkles size={18} aria-hidden="true" /> Todas as séries planejadas concluídas!
            </p>
          )}
          <p className="af-finish-save-note">
            Após finalizar, este registro fica salvo no seu histórico e não pode ser editado.
          </p>
          <button
            className="af-primary-button"
            type="button"
            onClick={() => {
              if (session) onFinishSession(session.id);
              closeFinishReview();
            }}
          >
            <CheckCircle2 size={18} aria-hidden="true" /> Finalizar e salvar
          </button>
          <button className="af-secondary-button" type="button" onClick={closeFinishReview}>
            Continuar treinando
          </button>
        </div>
      </dialog>
    </div>
  );
}
