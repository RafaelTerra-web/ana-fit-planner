import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, Exercise, ExerciseTarget, MuscleGroup, WeekPlanItem, Workout } from '../types';
import {
  calculateWeeklyVolume,
  formatSetLabel,
  getMuscleLabel,
  muscleOptions,
} from '../utils/workoutVolume';
import { Card } from './Card';
import { WeekPlanEditor } from './WeekPlanEditor';
import { WorkoutVolumePanel } from './WorkoutVolumePanel';

type WorkoutPlanManagerProps = {
  data: AppData;
  onWeekPlanChange: (weekPlan: WeekPlanItem[]) => void;
  onWorkoutsChange: (workouts: Workout[]) => void;
};

type WorkoutEditorModalProps = {
  activeWorkoutId?: string;
  isNew: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSave: (workout: Workout) => void;
  workout: Workout;
  workoutCount: number;
};

type EditorState = {
  assignDayIndex?: number;
  isNew: boolean;
  workout: Workout;
};

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createExercise(): Exercise {
  return {
    id: createId('exercise'),
    name: '',
    sets: 3,
    reps: '8 a 12 reps',
    rest: '90 s',
    rir: 'RIR 1-2',
    note: '',
    targets: [{ muscle: 'quadriceps', role: 'primary' }],
    progressionType: 'large',
  };
}

function createWorkout(): Workout {
  return {
    id: createId('workout'),
    title: '',
    shortTitle: '',
    focus: '',
    dayLabel: 'Personalizado',
    exercises: [createExercise()],
  };
}

function cloneWorkout(workout: Workout): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      targets: exercise.targets.map((target) => ({ ...target })),
    })),
  };
}

function parseNumericInput(value: string) {
  return Math.max(1, Math.round(Number(value) || 1));
}

function WorkoutEditorModal({
  activeWorkoutId,
  isNew,
  onClose,
  onDelete,
  onSave,
  workout,
  workoutCount,
}: WorkoutEditorModalProps) {
  const [draft, setDraft] = useState(() => cloneWorkout(workout));
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | undefined>(workout.exercises[0]?.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const initialSnapshotRef = useRef(JSON.stringify(workout));
  const exerciseEditingLocked = !isNew && activeWorkoutId === workout.id;
  const isDirty = JSON.stringify(draft) !== initialSnapshotRef.current;

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm('Descartar as alterações deste treino?')) return;
    onClose();
  }, [isDirty, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frameId = window.requestAnimationFrame(() => nameInputRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  const updateExercise = (exerciseId: string, changes: Partial<Exercise>) => {
    if (exerciseEditingLocked) return;
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => (exercise.id === exerciseId ? { ...exercise, ...changes } : exercise)),
    }));
  };

  const updateTarget = (exerciseId: string, targetIndex: number, changes: Partial<ExerciseTarget>) => {
    const exercise = draft.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    updateExercise(exerciseId, {
      targets: exercise.targets.map((target, index) => (index === targetIndex ? { ...target, ...changes } : target)),
    });
  };

  const addTarget = (exerciseId: string) => {
    const exercise = draft.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    updateExercise(exerciseId, { targets: [...exercise.targets, { muscle: 'glutes', role: 'secondary' }] });
  };

  const removeTarget = (exerciseId: string, targetIndex: number) => {
    const exercise = draft.exercises.find((item) => item.id === exerciseId);
    if (!exercise || exercise.targets.length <= 1) return;
    updateExercise(exerciseId, { targets: exercise.targets.filter((_, index) => index !== targetIndex) });
  };

  const addExercise = () => {
    if (exerciseEditingLocked) return;
    const exercise = createExercise();
    setDraft((current) => ({ ...current, exercises: [...current.exercises, exercise] }));
    setExpandedExerciseId(exercise.id);
  };

  const removeExercise = (exerciseId: string) => {
    if (exerciseEditingLocked || draft.exercises.length <= 1) return;
    const exercise = draft.exercises.find((item) => item.id === exerciseId);
    if (!window.confirm(`Remover ${exercise?.name || 'este exercício'}?`)) return;
    setDraft((current) => ({ ...current, exercises: current.exercises.filter((item) => item.id !== exerciseId) }));
    setExpandedExerciseId(undefined);
  };

  const moveExercise = (exerciseIndex: number, direction: -1 | 1) => {
    if (exerciseEditingLocked) return;
    const nextIndex = exerciseIndex + direction;
    if (nextIndex < 0 || nextIndex >= draft.exercises.length) return;
    setDraft((current) => {
      const exercises = [...current.exercises];
      [exercises[exerciseIndex], exercises[nextIndex]] = [exercises[nextIndex], exercises[exerciseIndex]];
      return { ...current, exercises };
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      setMessage('Dê um nome ao treino antes de salvar.');
      nameInputRef.current?.focus();
      return;
    }

    onSave({
      ...draft,
      title,
      shortTitle: title,
      focus: draft.focus.trim() || 'Treino personalizado.',
      exercises: draft.exercises.map((exercise, index) => ({
        ...exercise,
        name: exercise.name.trim() || `Exercício ${index + 1}`,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/95 backdrop-blur-xl" role="presentation">
      <form className="mx-auto flex h-full w-full max-w-lg flex-col" onSubmit={submit}>
        <header
          className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-slate-950/90 px-4 pb-3"
          style={{ paddingTop: 'max(0.85rem, env(safe-area-inset-top))' }}
        >
          <button
            aria-label="Voltar para ajustes"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300"
            onClick={requestClose}
            type="button"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{isNew ? 'Novo treino' : 'Editar treino'}</p>
            <h2 className="mt-1 truncate text-lg font-black text-slate-50">{draft.title || 'Treino sem nome'}</h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Card>
            <label className="block space-y-1.5 text-sm font-bold text-slate-300">
              <span>Nome do treino</span>
              <input
                className="input"
                maxLength={60}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, title: event.target.value, shortTitle: event.target.value }));
                  setMessage('');
                }}
                placeholder="Ex.: Glúteos e quadríceps"
                ref={nameInputRef}
                value={draft.title}
              />
            </label>
            <label className="mt-3 block space-y-1.5 text-sm font-bold text-slate-300">
              <span>Foco ou orientação</span>
              <textarea
                className="input min-h-20 resize-none"
                onChange={(event) => setDraft((current) => ({ ...current, focus: event.target.value }))}
                placeholder="Ex.: Priorizar amplitude e controle"
                value={draft.focus}
              />
            </label>
          </Card>

          {exerciseEditingLocked ? (
            <div className="mt-3 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] p-3 text-sm leading-relaxed text-amber-100">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
              Finalize a sessão em andamento antes de alterar, reordenar ou remover exercícios deste treino.
            </div>
          ) : null}

          <div className="mt-5 flex items-end justify-between gap-3 px-1">
            <div>
              <p className="eyebrow">Estrutura</p>
              <h3 className="section-title mt-1">Exercícios</h3>
            </div>
            <span className="text-xs font-bold text-slate-500">{draft.exercises.length} no treino</span>
          </div>

          <div className="mt-3 space-y-3">
            {draft.exercises.map((exercise, exerciseIndex) => {
              const isExpanded = expandedExerciseId === exercise.id;
              return (
                <section className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-900/70" key={exercise.id}>
                  <button
                    aria-expanded={isExpanded}
                    className="flex w-full items-center gap-3 p-3 text-left"
                    onClick={() => setExpandedExerciseId(isExpanded ? undefined : exercise.id)}
                    type="button"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-300/10 text-xs font-black text-lime-200">
                      {exerciseIndex + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-slate-100">{exercise.name || 'Novo exercício'}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-500">{formatSetLabel(exercise)} · {exercise.reps}</span>
                    </span>
                    <ChevronDown className={`shrink-0 text-slate-500 transition ${isExpanded ? 'rotate-180' : ''}`} size={18} aria-hidden="true" />
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-white/10 p-3">
                      <label className="block space-y-1 text-xs font-bold text-slate-400">
                        <span>Nome do exercício</span>
                        <input
                          className="input"
                          disabled={exerciseEditingLocked}
                          onChange={(event) => updateExercise(exercise.id, { name: event.target.value })}
                          placeholder="Ex.: Leg press"
                          value={exercise.name}
                        />
                      </label>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <label className="space-y-1 text-xs font-bold text-slate-400">
                          <span>Séries</span>
                          <input
                            className="input"
                            disabled={exerciseEditingLocked}
                            inputMode="numeric"
                            onChange={(event) => updateExercise(exercise.id, { sets: parseNumericInput(event.target.value) })}
                            value={exercise.sets}
                          />
                        </label>
                        <label className="space-y-1 text-xs font-bold text-slate-400">
                          <span>Repetições</span>
                          <input
                            className="input"
                            disabled={exerciseEditingLocked}
                            onChange={(event) => updateExercise(exercise.id, { reps: event.target.value })}
                            value={exercise.reps}
                          />
                        </label>
                        <label className="col-span-2 space-y-1 text-xs font-bold text-slate-400">
                          <span>Descanso</span>
                          <input
                            className="input"
                            disabled={exerciseEditingLocked}
                            onChange={(event) => updateExercise(exercise.id, { rest: event.target.value })}
                            placeholder="Ex.: 90 s"
                            value={exercise.rest}
                          />
                        </label>
                      </div>

                      <details className="manage-plan mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-xs font-extrabold text-slate-300">
                          Opções avançadas
                          <ChevronDown className="manage-chevron text-slate-500 transition" size={16} aria-hidden="true" />
                        </summary>
                        <div className="space-y-3 border-t border-white/10 p-3">
                          <div className="grid grid-cols-2 gap-2">
                            <label className="space-y-1 text-xs font-bold text-slate-400">
                              <span>RIR</span>
                              <input
                                className="input"
                                disabled={exerciseEditingLocked}
                                onChange={(event) => updateExercise(exercise.id, { rir: event.target.value })}
                                value={exercise.rir ?? ''}
                              />
                            </label>
                            <label className="space-y-1 text-xs font-bold text-slate-400">
                              <span>Tipo</span>
                              <select
                                className="input"
                                disabled={exerciseEditingLocked}
                                onChange={(event) => updateExercise(exercise.id, { progressionType: event.target.value as Exercise['progressionType'] })}
                                value={exercise.progressionType}
                              >
                                <option value="large">Composto</option>
                                <option value="isolation">Isolador</option>
                              </select>
                            </label>
                          </div>
                          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-slate-200">
                            <input
                              checked={Boolean(exercise.unilateral)}
                              className="h-5 w-5 accent-lime-300"
                              disabled={exerciseEditingLocked}
                              onChange={(event) => updateExercise(exercise.id, { unilateral: event.target.checked })}
                              type="checkbox"
                            />
                            Séries por perna
                          </label>
                          <label className="block space-y-1 text-xs font-bold text-slate-400">
                            <span>Nota</span>
                            <textarea
                              className="input min-h-20 resize-none"
                              disabled={exerciseEditingLocked}
                              onChange={(event) => updateExercise(exercise.id, { note: event.target.value })}
                              value={exercise.note ?? ''}
                            />
                          </label>

                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Músculos-alvo</p>
                              <button
                                className="text-xs font-bold text-teal-300"
                                disabled={exerciseEditingLocked}
                                onClick={() => addTarget(exercise.id)}
                                type="button"
                              >
                                Adicionar alvo
                              </button>
                            </div>
                            <div className="mt-2 space-y-2">
                              {exercise.targets.map((target, targetIndex) => (
                                <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={`${exercise.id}-${targetIndex}`}>
                                  <select
                                    aria-label={`Músculo-alvo ${targetIndex + 1}`}
                                    className="input min-w-0"
                                    disabled={exerciseEditingLocked}
                                    onChange={(event) => updateTarget(exercise.id, targetIndex, { muscle: event.target.value as MuscleGroup })}
                                    value={target.muscle}
                                  >
                                    {muscleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                  </select>
                                  <select
                                    aria-label={`Participação de ${getMuscleLabel(target.muscle)}`}
                                    className="input min-w-0"
                                    disabled={exerciseEditingLocked}
                                    onChange={(event) => updateTarget(exercise.id, targetIndex, { role: event.target.value as ExerciseTarget['role'] })}
                                    value={target.role}
                                  >
                                    <option value="primary">Principal</option>
                                    <option value="secondary">Secundário</option>
                                  </select>
                                  <button
                                    aria-label={`Remover alvo ${getMuscleLabel(target.muscle)}`}
                                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400"
                                    disabled={exerciseEditingLocked || exercise.targets.length <= 1}
                                    onClick={() => removeTarget(exercise.id, targetIndex)}
                                    type="button"
                                  >
                                    <Trash2 size={16} aria-hidden="true" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </details>

                      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                        <button
                          aria-label="Mover exercício para cima"
                          className="secondary-button min-h-11 px-2"
                          disabled={exerciseEditingLocked || exerciseIndex === 0}
                          onClick={() => moveExercise(exerciseIndex, -1)}
                          type="button"
                        >
                          <ChevronUp size={17} aria-hidden="true" /> Subir
                        </button>
                        <button
                          aria-label="Mover exercício para baixo"
                          className="secondary-button min-h-11 px-2"
                          disabled={exerciseEditingLocked || exerciseIndex === draft.exercises.length - 1}
                          onClick={() => moveExercise(exerciseIndex, 1)}
                          type="button"
                        >
                          <ChevronDown size={17} aria-hidden="true" /> Descer
                        </button>
                        <button
                          aria-label={`Remover ${exercise.name || 'exercício'}`}
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-100"
                          disabled={exerciseEditingLocked || draft.exercises.length <= 1}
                          onClick={() => removeExercise(exercise.id)}
                          type="button"
                        >
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>

          <button className="secondary-button mt-3 w-full" disabled={exerciseEditingLocked} onClick={addExercise} type="button">
            <Plus size={18} aria-hidden="true" /> Adicionar exercício
          </button>

          {!isNew && !showDeleteConfirm ? (
            <button
              className="secondary-button mt-6 w-full border-rose-400/30 text-rose-100"
              disabled={workoutCount <= 1 || exerciseEditingLocked}
              onClick={() => setShowDeleteConfirm(true)}
              type="button"
            >
              <Trash2 size={18} aria-hidden="true" /> Excluir treino
            </button>
          ) : null}
          {showDeleteConfirm ? (
            <div className="mt-6 rounded-2xl border border-rose-400/25 bg-rose-500/[0.08] p-4" role="alert">
              <p className="text-sm font-extrabold text-rose-100">Excluir este treino?</p>
              <p className="mt-1 text-xs leading-relaxed text-rose-100/70">
                Os dias associados passarão para descanso. Seu histórico de treinos concluídos será mantido.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="secondary-button" onClick={() => setShowDeleteConfirm(false)} type="button">
                  Manter treino
                </button>
                <button className="secondary-button border-rose-400/30 bg-rose-500/10 text-rose-100" onClick={onDelete} type="button">
                  Confirmar exclusão
                </button>
              </div>
            </div>
          ) : null}
          {!isNew && workoutCount <= 1 ? <p className="mt-2 text-center text-xs text-slate-500">Mantenha pelo menos um treino cadastrado.</p> : null}
          {message ? <p className="mt-3 text-sm font-bold text-rose-300" role="alert">{message}</p> : null}
        </div>

        <footer
          className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/10 bg-slate-950/95 px-4 pt-3"
          style={{ paddingBottom: 'max(0.85rem, env(safe-area-inset-bottom))' }}
        >
          <button className="secondary-button" onClick={requestClose} type="button">Cancelar</button>
          <button className="primary-button" type="submit"><Save size={18} aria-hidden="true" /> Salvar</button>
        </footer>
      </form>
    </div>
  );
}

export function WorkoutPlanManager({ data, onWeekPlanChange, onWorkoutsChange }: WorkoutPlanManagerProps) {
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const activeSession = data.activeWorkoutSessionId ? data.workoutSessions[data.activeWorkoutSessionId] : undefined;
  const activeWorkoutId = activeSession && !activeSession.completedAt ? activeSession.workoutId : undefined;
  const weeklyVolume = useMemo(() => calculateWeeklyVolume(data.workouts, data.weekPlan), [data.weekPlan, data.workouts]);

  const openExistingWorkout = (workout: Workout) => {
    setEditorState({ isNew: false, workout: cloneWorkout(workout) });
  };

  const openNewWorkout = (assignDayIndex?: number) => {
    setEditorState({ assignDayIndex, isNew: true, workout: createWorkout() });
  };

  const saveWorkout = (workout: Workout) => {
    const nextWorkouts = editorState?.isNew
      ? [...data.workouts, workout]
      : data.workouts.map((item) => (item.id === workout.id ? workout : item));
    onWorkoutsChange(nextWorkouts);

    const assignDayIndex = editorState?.assignDayIndex;
    onWeekPlanChange(
      data.weekPlan.map((item) => {
        if (item.dayIndex === assignDayIndex) {
          return {
            ...item,
            activityType: 'workout' as const,
            title: workout.title,
            workoutId: workout.id,
            cardio: undefined,
            rest: undefined,
          };
        }
        return item.workoutId === workout.id ? { ...item, title: workout.title } : item;
      })
    );
    setEditorState(null);
  };

  const deleteWorkout = () => {
    if (!editorState || editorState.isNew || data.workouts.length <= 1 || activeWorkoutId === editorState.workout.id) return;

    onWorkoutsChange(data.workouts.filter((workout) => workout.id !== editorState.workout.id));
    onWeekPlanChange(
      data.weekPlan.map((item) =>
        item.workoutId === editorState.workout.id
          ? {
              ...item,
              activityType: 'rest' as const,
              title: 'Descanso e recuperação',
              workoutId: undefined,
              cardio: undefined,
              rest: 'Recuperação e rotina leve.',
            }
          : item
      )
    );
    setEditorState(null);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-200">
            <Dumbbell size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-lime-300">1 · Crie</p>
            <h2 className="section-title mt-1">Meus treinos</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">Dê um nome claro e monte os exercícios de cada treino.</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {data.workouts.map((workout) => {
            const assignedDays = data.weekPlan.filter((item) => item.workoutId === workout.id).map((item) => item.dayLabel);
            const isActive = activeWorkoutId === workout.id;
            return (
              <button
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-lime-300/25 hover:bg-lime-300/[0.05]"
                key={workout.id}
                onClick={() => openExistingWorkout(workout)}
                type="button"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950/60 text-lime-200">
                  <Dumbbell size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-extrabold text-slate-100">{workout.title}</span>
                    {isActive ? <span className="shrink-0 rounded-full bg-amber-300/10 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wide text-amber-200">Em andamento</span> : null}
                  </span>
                  <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                    {workout.exercises.length} {workout.exercises.length === 1 ? 'exercício' : 'exercícios'} ·{' '}
                    {assignedDays.length ? assignedDays.join(', ') : 'Ainda não programado'}
                  </span>
                </span>
                <Pencil className="shrink-0 text-slate-500" size={18} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <button className="primary-button mt-3 w-full" onClick={() => openNewWorkout()} type="button">
          <Plus size={18} aria-hidden="true" /> Novo treino
        </button>
      </Card>

      <WeekPlanEditor
        onChange={onWeekPlanChange}
        onCreateWorkoutForDay={openNewWorkout}
        weekPlan={data.weekPlan}
        workouts={data.workouts}
      />

      <WorkoutVolumePanel volume={weeklyVolume} />

      {editorState ? (
        <WorkoutEditorModal
          activeWorkoutId={activeWorkoutId}
          isNew={editorState.isNew}
          key={editorState.workout.id}
          onClose={() => setEditorState(null)}
          onDelete={deleteWorkout}
          onSave={saveWorkout}
          workout={editorState.workout}
          workoutCount={data.workouts.length}
        />
      ) : null}
    </>
  );
}
