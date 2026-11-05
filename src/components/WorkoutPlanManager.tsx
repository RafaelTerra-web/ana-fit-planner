import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Dumbbell,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, Exercise, WeekPlanItem, Workout } from '../types';
import { calculateWeeklyVolume, getMuscleLabel } from '../utils/workoutVolume';
import {
  createCatalogExercise,
  findCatalogExercise,
  focusLabels,
  getWorkoutFocus,
} from '../utils/exerciseCatalog';
import { Card } from './Card';
import { ExerciseLibrary } from './ExerciseLibrary';
import type { LibraryExercise } from '../data/exerciseLibrary';
import { WeekPlanEditor } from './WeekPlanEditor';
import { WorkoutVolumePanel } from './WorkoutVolumePanel';
import { ExerciseArtwork, WorkoutArtwork } from './WorkoutArtwork';
import { ExercisePrescription } from './ExercisePrescription';
import { ExerciseReference } from './ExerciseReference';

type WorkoutPlanManagerProps = {
  data: AppData;
  initialWorkoutId?: string;
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
type EditorState = { assignDayIndex?: number; isNew: boolean; workout: Workout };

function createId(prefix: string) {
  return `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}
function createWorkout(): Workout {
  return {
    id: createId('workout'),
    title: 'Meu novo treino',
    shortTitle: 'Meu novo treino',
    focus: '',
    dayLabel: 'Personalizado',
    exercises: [],
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
  const [picker, setPicker] = useState<string | true | false>(false);
  const [reference, setReference] = useState<Exercise | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const initialSnapshotRef = useRef(JSON.stringify(workout));
  const previousFocusRef = useRef<HTMLElement | null>(document.activeElement as HTMLElement);
  const locked = !isNew && activeWorkoutId === workout.id;
  const focus = getWorkoutFocus(draft);
  const isDirty = JSON.stringify(draft) !== initialSnapshotRef.current;
  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm('Descartar as alterações deste treino?')) return;
    onClose();
  }, [isDirty, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    const previousFocus = previousFocusRef.current;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.cancelAnimationFrame(frame);
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (reference) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (picker) setPicker(false);
        else requestClose();
      }
      if (event.key !== 'Tab') return;
      const controls = [
        ...(modalRef.current?.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, a[href], summary, [tabindex="0"]',
        ) ?? []),
      ].filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === headingRef.current)
      ) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [picker, reference, requestClose]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [picker]);

  const updateExercise = (id: string, changes: Partial<Exercise>) => {
    if (!locked)
      setDraft((current) => ({
        ...current,
        exercises: current.exercises.map((item) => (item.id === id ? { ...item, ...changes } : item)),
      }));
  };
  const selectExercise = (template: LibraryExercise) => {
    if (locked) return;
    const exercise = createCatalogExercise(template, createId('exercise'));
    setDraft((current) => ({
      ...current,
      exercises:
        typeof picker === 'string'
          ? current.exercises.map((item) => (item.id === picker ? { ...exercise, sets: item.sets } : item))
          : [...current.exercises, exercise],
    }));
    if (typeof picker === 'string') setPicker(false);
    setMessage('');
  };
  const move = (index: number, direction: -1 | 1) => {
    if (locked || index + direction < 0 || index + direction >= draft.exercises.length) return;
    setDraft((current) => {
      const exercises = [...current.exercises];
      [exercises[index], exercises[index + direction]] = [exercises[index + direction], exercises[index]];
      return { ...current, exercises };
    });
  };
  const remove = (exercise: Exercise) => {
    if (
      locked ||
      draft.exercises.length <= 1 ||
      !window.confirm(`Remover ${exercise.name} deste treino? O histórico será mantido.`)
    )
      return;
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.filter((item) => item.id !== exercise.id),
    }));
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (picker) return;
    if (!draft.exercises.length) {
      setMessage('Escolha pelo menos um exercício no banco para montar seu treino.');
      return;
    }
    if (!draft.title.trim()) {
      setMessage('Informe um nome no campo Personalizar nome.');
      nameInputRef.current?.closest('details')?.setAttribute('open', '');
      nameInputRef.current?.focus();
      return;
    }
    if (
      draft.exercises.some(
        (exercise) => !exercise.reps.trim() || exercise.sets < 1 || !Number.isFinite(exercise.sets),
      )
    ) {
      setMessage('Confira as séries e repetições dos exercícios.');
      return;
    }
    onSave({
      ...draft,
      title: draft.title.trim(),
      shortTitle: draft.title === workout.title ? workout.shortTitle : draft.title.trim(),
      focus: draft.focus.trim() || `Treino de ${focusLabels[focus.group].toLocaleLowerCase('pt-BR')}.`,
    });
  };

  return (
    <div
      className="workout-editor-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'Criar treino' : 'Editar treino'}
      ref={modalRef}
    >
      <form className="workout-editor" onSubmit={submit}>
        <header className="editor-toolbar">
          <button
            type="button"
            className="editor-back"
            aria-label={picker ? 'Voltar ao treino' : 'Voltar para ajustes'}
            onClick={() => (picker ? setPicker(false) : requestClose())}
          >
            <ArrowLeft size={21} />
          </button>
          <div>
            <span className="editor-eyebrow">
              {picker ? 'SELEÇÃO DE MOVIMENTOS' : isNew ? 'MONTE DO SEU JEITO' : 'SUA FICHA, SEU RITMO'}
            </span>
            <h2 ref={headingRef} tabIndex={-1}>
              {picker ? 'Escolher exercícios' : draft.title}
            </h2>
          </div>
          {!picker && <span className="editor-draft-badge">{isDirty ? 'Não salvo' : 'Sua ficha'}</span>}
        </header>
        <div className="editor-scroll" key={picker ? 'library' : 'prescription'}>
          {picker ? (
            <ExerciseLibrary
              onAdd={selectExercise}
              onView={(template) => setReference(createCatalogExercise(template, 'preview'))}
              initialFocus={draft.exercises.length ? focus.group : 'full'}
              replacing={typeof picker === 'string'}
              selected={draft.exercises.map((exercise) => findCatalogExercise(exercise)?.catalogId ?? '')}
            />
          ) : (
            <>
              <div className="editor-overview">
                <WorkoutArtwork workout={draft} />
                <div className="editor-overview-stats">
                  <span>
                    <b>{draft.exercises.length}</b> exercícios
                  </span>
                  <span>
                    <b>{draft.exercises.reduce((sum, exercise) => sum + exercise.sets, 0)}</b> séries
                  </span>
                  <span>
                    <Check size={13} />
                    Salvo ao confirmar
                  </span>
                </div>
              </div>
              {locked && (
                <div className="editor-lock" role="status">
                  <AlertTriangle size={19} />
                  <span>
                    Este treino está em andamento. Finalize a sessão antes de alterar os exercícios e a
                    prescrição. Seu histórico permanece protegido.
                  </span>
                </div>
              )}
              <div className="editor-section-heading">
                <div>
                  <span className="editor-eyebrow">01 · AJUSTE A SUA DOSE</span>
                  <h3>Exercícios do treino</h3>
                  <p>Use + e − para séries e carga. Toque nas repetições para escolher uma faixa.</p>
                </div>
              </div>
              <div className="editor-exercises">
                {draft.exercises.map((exercise, index) => (
                  <article className="editor-exercise" key={exercise.id}>
                    <div className="editor-exercise-top">
                      <button
                        className="editor-exercise-preview"
                        type="button"
                        aria-label={`Ver execução de ${exercise.name}`}
                        onClick={() => setReference(exercise)}
                      >
                        <ExerciseArtwork exercise={exercise} />
                        <span>
                          <Eye size={12} />
                          Ver
                        </span>
                      </button>
                      <div className="editor-exercise-identity">
                        <span className="editor-order">EXERCÍCIO {String(index + 1).padStart(2, '0')}</span>
                        <h4>{exercise.name}</h4>
                        <div className="editor-muscle-tags">
                          {exercise.targets
                            .filter((target) => target.role === 'primary')
                            .map((target) => (
                              <span key={target.muscle}>{getMuscleLabel(target.muscle)}</span>
                            ))}
                        </div>
                        <small>
                          {exercise.equipment ?? findCatalogExercise(exercise)?.equipment ?? 'Da sua ficha'}
                        </small>
                      </div>
                    </div>
                    <ExercisePrescription
                      exercise={exercise}
                      disabled={locked}
                      onChange={(changes) => updateExercise(exercise.id, changes)}
                    />
                    <div className="editor-exercise-actions">
                      <button
                        type="button"
                        disabled={locked}
                        aria-label={`Substituir ${exercise.name}`}
                        onClick={() => setPicker(exercise.id)}
                      >
                        <RefreshCw size={13} />
                        Substituir
                      </button>
                      <span />
                      <button
                        type="button"
                        disabled={locked || index === 0}
                        aria-label={`Mover ${exercise.name} para cima`}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        disabled={locked || index === draft.exercises.length - 1}
                        aria-label={`Mover ${exercise.name} para baixo`}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        type="button"
                        disabled={locked || draft.exercises.length <= 1}
                        aria-label={`Remover ${exercise.name}`}
                        onClick={() => remove(exercise)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!draft.exercises.length && (
                <div className="editor-empty">
                  <Dumbbell size={30} />
                  <h3>Seu treino começa com um movimento</h3>
                  <p>Escolha no banco. Depois, ajuste séries, repetições e carga.</p>
                </div>
              )}
              <button
                className="editor-add-exercise"
                type="button"
                disabled={locked}
                onClick={() => setPicker(true)}
              >
                <span>
                  <Plus size={22} />
                </span>
                <span>
                  <strong>Adicionar exercício</strong>
                  <small>Escolha no banco visual de movimentos</small>
                </span>
                <ChevronDown size={18} />
              </button>
              <details className="editor-metadata">
                <summary>
                  <Pencil size={15} />
                  <span>Personalizar nome e orientação</span>
                  <ChevronDown size={15} />
                </summary>
                <div>
                  <label>
                    Nome do treino
                    <input
                      className="input"
                      ref={nameInputRef}
                      value={draft.title}
                      maxLength={60}
                      onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>
                  <label>
                    Orientação opcional
                    <textarea
                      className="input"
                      value={draft.focus}
                      maxLength={300}
                      onChange={(event) => setDraft((current) => ({ ...current, focus: event.target.value }))}
                      placeholder="Uma observação para lembrar na hora de treinar"
                    />
                  </label>
                </div>
              </details>
              {!isNew && (
                <details className="editor-danger">
                  <summary>
                    Outras opções
                    <ChevronDown size={14} />
                  </summary>
                  <div>
                    {showDeleteConfirm ? (
                      <>
                        <p>
                          Excluir este treino? Os dias associados passam para descanso e o histórico é
                          mantido.
                        </p>
                        <button type="button" onClick={() => setShowDeleteConfirm(false)}>
                          Manter treino
                        </button>
                        <button type="button" onClick={onDelete}>
                          Confirmar exclusão
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={workoutCount <= 1 || locked}
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 size={14} />
                        Excluir treino
                      </button>
                    )}
                  </div>
                </details>
              )}
              {message && (
                <p className="editor-message" role="alert">
                  {message}
                </p>
              )}
            </>
          )}
        </div>
        <footer className="editor-footer" key={picker ? 'selection-footer' : 'prescription-footer'}>
          {picker ? (
            <>
              <span>
                <b>{draft.exercises.length}</b> exercícios no treino
              </span>
              <button
                className="primary-button"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setPicker(false);
                }}
              >
                <Check size={17} />
                Concluir seleção
              </button>
            </>
          ) : (
            <>
              <button className="secondary-button" type="button" onClick={requestClose}>
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                <Save size={17} />
                Salvar treino
              </button>
            </>
          )}
        </footer>
      </form>
      {reference && <ExerciseReference exercise={reference} onClose={() => setReference(null)} />}
    </div>
  );
}

export function WorkoutPlanManager({
  data,
  onWeekPlanChange,
  onWorkoutsChange,
  initialWorkoutId,
}: WorkoutPlanManagerProps) {
  const [editorState, setEditorState] = useState<EditorState | null>(() => {
    const initial = data.workouts.find((workout) => workout.id === initialWorkoutId);
    return initial ? { isNew: false, workout: cloneWorkout(initial) } : null;
  });
  const activeSession = data.activeWorkoutSessionId
    ? data.workoutSessions[data.activeWorkoutSessionId]
    : undefined;
  const activeWorkoutId = activeSession && !activeSession.completedAt ? activeSession.workoutId : undefined;
  const weeklyVolume = useMemo(
    () => calculateWeeklyVolume(data.workouts, data.weekPlan),
    [data.weekPlan, data.workouts],
  );

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
      }),
    );
    setEditorState(null);
  };

  const deleteWorkout = () => {
    if (
      !editorState ||
      editorState.isNew ||
      data.workouts.length <= 1 ||
      activeWorkoutId === editorState.workout.id
    )
      return;

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
          : item,
      ),
    );
    setEditorState(null);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-start gap-3" data-tour="settings-workouts">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-200">
            <Dumbbell size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-lime-300">1 · Crie</p>
            <h2 className="section-title mt-1">Meus treinos</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Escolha os movimentos e ajuste séries, repetições e carga em uma ficha visual.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {data.workouts.map((workout) => {
            const assignedDays = data.weekPlan
              .filter((item) => item.workoutId === workout.id)
              .map((item) => item.dayLabel);
            const isActive = activeWorkoutId === workout.id;
            return (
              <button
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-lime-300/25 hover:bg-lime-300/[0.05]"
                key={workout.id}
                onClick={() => openExistingWorkout(workout)}
                aria-label={`Editar ficha ${workout.title}`}
                type="button"
              >
                <span className="manager-workout-art">
                  <WorkoutArtwork workout={workout} compact />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-extrabold text-slate-100">{workout.title}</span>
                    {isActive ? (
                      <span className="shrink-0 rounded-full bg-amber-300/10 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wide text-amber-200">
                        Em andamento
                      </span>
                    ) : null}
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
