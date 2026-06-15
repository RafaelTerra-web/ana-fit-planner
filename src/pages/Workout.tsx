import { AlertTriangle, BarChart3, CalendarDays, ChevronDown, ChevronUp, HeartPulse, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { ExerciseCard } from '../components/ExerciseCard';
import { ProgressBar } from '../components/ProgressBar';
import { getWorkoutById } from '../data/workoutPlan';
import type { AppData, DailyChecks, Exercise, ExerciseLog, ExerciseTarget, MuscleGroup, WeekPlanItem, Workout as WorkoutModel } from '../types';
import { calculateAdherence, getWeekCheckEntries } from '../utils/calculations';
import {
  calculateWeeklyVolume,
  formatSetLabel,
  formatVolume,
  getMuscleLabel,
  getVolumeStatus,
  muscleOptions,
  volumeTargets,
} from '../utils/workoutVolume';

type WorkoutProps = {
  data: AppData;
  todayChecks: DailyChecks;
  todayPlan: WeekPlanItem;
  onExerciseLogChange: (exerciseId: string, log: ExerciseLog) => void;
  onToggleCheck: (key: keyof Omit<DailyChecks, 'meals'>) => void;
  onWeekPlanChange: (weekPlan: WeekPlanItem[]) => void;
  onWorkoutsChange: (workouts: WorkoutModel[]) => void;
};

type VolumePanelProps = {
  volume: Record<MuscleGroup, number>;
};

type WorkoutEditorProps = {
  selectedWorkout: WorkoutModel;
  selectedWorkoutId: string;
  weekPlan: WeekPlanItem[];
  workouts: WorkoutModel[];
  onSelectWorkout: (workoutId: string) => void;
  onWeekPlanChange: (weekPlan: WeekPlanItem[]) => void;
  onWorkoutsChange: (workouts: WorkoutModel[]) => void;
};

const statusToneClasses = {
  slate: 'border-slate-500/20 bg-white/5 text-slate-300',
  teal: 'border-teal-400/25 bg-teal-400/10 text-teal-100',
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  rose: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
};

const barToneClasses = {
  slate: 'bg-slate-500',
  teal: 'bg-teal-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
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
    name: 'Novo exercicio',
    sets: 2,
    reps: '8 a 12 reps',
    rest: '90 s',
    rir: 'RIR 1-2',
    note: '',
    targets: [{ muscle: 'quadriceps', role: 'primary' }],
    progressionType: 'large',
  };
}

function createWorkout(): WorkoutModel {
  return {
    id: createId('workout'),
    title: 'Novo treino',
    shortTitle: 'Novo',
    focus: 'Defina o foco deste treino.',
    dayLabel: 'Custom',
    exercises: [createExercise()],
  };
}

function parseNumericInput(value: string) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function VolumePanel({ volume }: VolumePanelProps) {
  const activeRows = muscleOptions.filter((option) => volume[option.value] > 0 || option.value === 'quadriceps' || option.value === 'glutes');
  const highVolumeRows = activeRows.filter((option) => getVolumeStatus(option.value, volume[option.value]).level === 'high');

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="text-teal-700" size={20} aria-hidden="true" />
            <h2 className="section-title">Volume semanal</h2>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">Principal conta 1x. Secundario conta 0,5x.</p>
        </div>
        {highVolumeRows.length ? <AlertTriangle className="shrink-0 text-rose-700" size={22} aria-hidden="true" /> : null}
      </div>

      <div className="mt-4 space-y-3">
        {activeRows.map((option) => {
          const currentVolume = volume[option.value];
          const target = volumeTargets[option.value];
          const status = getVolumeStatus(option.value, currentVolume);
          const barWidth = `${Math.min(100, Math.round((currentVolume / 15) * 100))}%`;

          return (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3" key={option.value}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-100">{option.label}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Alvo {target.min}-{target.max} series
                  </p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-xs font-bold ${statusToneClasses[status.tone]}`}>
                  {formatVolume(currentVolume)}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${barToneClasses[status.tone]}`} style={{ width: barWidth }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-400">
                {status.label}: {status.message}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WorkoutEditor({
  selectedWorkout,
  selectedWorkoutId,
  weekPlan,
  workouts,
  onSelectWorkout,
  onWeekPlanChange,
  onWorkoutsChange,
}: WorkoutEditorProps) {
  const updateWeekItem = (dayIndex: number, changes: Partial<WeekPlanItem>) => {
    onWeekPlanChange(weekPlan.map((item) => (item.dayIndex === dayIndex ? { ...item, ...changes } : item)));
  };

  const updateWorkout = (changes: Partial<WorkoutModel>) => {
    onWorkoutsChange(workouts.map((workout) => (workout.id === selectedWorkout.id ? { ...workout, ...changes } : workout)));
  };

  const updateExercise = (exerciseId: string, changes: Partial<Exercise>) => {
    updateWorkout({
      exercises: selectedWorkout.exercises.map((exercise) => (exercise.id === exerciseId ? { ...exercise, ...changes } : exercise)),
    });
  };

  const updateExerciseTarget = (exerciseId: string, targetIndex: number, changes: Partial<ExerciseTarget>) => {
    const exercise = selectedWorkout.exercises.find((item) => item.id === exerciseId);
    if (!exercise) {
      return;
    }

    updateExercise(exerciseId, {
      targets: exercise.targets.map((target, index) => (index === targetIndex ? { ...target, ...changes } : target)),
    });
  };

  const addTarget = (exerciseId: string) => {
    const exercise = selectedWorkout.exercises.find((item) => item.id === exerciseId);
    if (!exercise) {
      return;
    }

    updateExercise(exerciseId, {
      targets: [...exercise.targets, { muscle: 'glutes', role: 'secondary' }],
    });
  };

  const removeTarget = (exerciseId: string, targetIndex: number) => {
    const exercise = selectedWorkout.exercises.find((item) => item.id === exerciseId);
    if (!exercise || exercise.targets.length <= 1) {
      return;
    }

    updateExercise(exerciseId, {
      targets: exercise.targets.filter((_, index) => index !== targetIndex),
    });
  };

  const addExercise = () => {
    updateWorkout({
      exercises: [...selectedWorkout.exercises, createExercise()],
    });
  };

  const removeExercise = (exerciseId: string) => {
    updateWorkout({
      exercises: selectedWorkout.exercises.filter((exercise) => exercise.id !== exerciseId),
    });
  };

  const moveExercise = (exerciseIndex: number, direction: -1 | 1) => {
    const nextIndex = exerciseIndex + direction;
    if (nextIndex < 0 || nextIndex >= selectedWorkout.exercises.length) {
      return;
    }

    const nextExercises = [...selectedWorkout.exercises];
    [nextExercises[exerciseIndex], nextExercises[nextIndex]] = [nextExercises[nextIndex], nextExercises[exerciseIndex]];
    updateWorkout({ exercises: nextExercises });
  };

  const addWorkout = () => {
    const workout = createWorkout();
    onWorkoutsChange([...workouts, workout]);
    onSelectWorkout(workout.id);
  };

  const removeWorkout = () => {
    if (workouts.length <= 1) {
      return;
    }

    const confirmed = window.confirm(`Remover ${selectedWorkout.title}?`);
    if (!confirmed) {
      return;
    }

    const nextWorkouts = workouts.filter((workout) => workout.id !== selectedWorkout.id);
    onWorkoutsChange(nextWorkouts);
    onWeekPlanChange(weekPlan.map((item) => (item.workoutId === selectedWorkout.id ? { ...item, workoutId: undefined } : item)));
    onSelectWorkout(nextWorkouts[0].id);
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Editor de treino</h2>
          <p className="mt-1 text-sm text-slate-600">Split, exercicios, parametros e musculos-alvo.</p>
        </div>
        <button className="secondary-button min-h-0 px-3 py-2 text-sm" type="button" onClick={addWorkout}>
          <Plus size={16} aria-hidden="true" />
          Treino
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          <span>Treino selecionado</span>
          <select className="input" value={selectedWorkoutId} onChange={(event) => onSelectWorkout(event.target.value)}>
            {workouts.map((workout) => (
              <option key={workout.id} value={workout.id}>
                {workout.title}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Titulo</span>
            <input className="input" value={selectedWorkout.title} onChange={(event) => updateWorkout({ title: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Nome curto</span>
            <input className="input" value={selectedWorkout.shortTitle} onChange={(event) => updateWorkout({ shortTitle: event.target.value })} />
          </label>
        </div>

        <label className="block space-y-1 text-sm font-medium text-slate-700">
          <span>Foco</span>
          <textarea className="input min-h-20 resize-none" value={selectedWorkout.focus} onChange={(event) => updateWorkout({ focus: event.target.value })} />
        </label>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Split semanal</h3>
        <div className="mt-3 space-y-3">
          {weekPlan.map((item) => (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3" key={item.dayIndex}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.dayLabel}</p>
              <div className="mt-2 grid gap-2">
                <input className="input" value={item.title} onChange={(event) => updateWeekItem(item.dayIndex, { title: event.target.value })} />
                <select
                  className="input"
                  value={item.workoutId ?? ''}
                  onChange={(event) => updateWeekItem(item.dayIndex, { workoutId: event.target.value || undefined })}
                >
                  <option value="">Sem musculacao</option>
                  {workouts.map((workout) => (
                    <option key={workout.id} value={workout.id}>
                      {workout.shortTitle}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input"
                    placeholder="Cardio"
                    value={item.cardio ?? ''}
                    onChange={(event) => updateWeekItem(item.dayIndex, { cardio: event.target.value || undefined })}
                  />
                  <input
                    className="input"
                    placeholder="Descanso"
                    value={item.rest ?? ''}
                    onChange={(event) => updateWeekItem(item.dayIndex, { rest: event.target.value || undefined })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Exercicios</h3>
        <button className="secondary-button min-h-0 px-3 py-2 text-sm" type="button" onClick={addExercise}>
          <Plus size={16} aria-hidden="true" />
          Exercicio
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {selectedWorkout.exercises.map((exercise, exerciseIndex) => (
          <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3" key={exercise.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100">{exercise.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{formatSetLabel(exercise)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  aria-label="Mover exercicio para cima"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300"
                  disabled={exerciseIndex === 0}
                  onClick={() => moveExercise(exerciseIndex, -1)}
                  type="button"
                >
                  <ChevronUp size={16} aria-hidden="true" />
                </button>
                <button
                  aria-label="Mover exercicio para baixo"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300"
                  disabled={exerciseIndex === selectedWorkout.exercises.length - 1}
                  onClick={() => moveExercise(exerciseIndex, 1)}
                  type="button"
                >
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
                <button
                  aria-label="Remover exercicio"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-400/20 bg-rose-500/10 text-rose-100"
                  onClick={() => removeExercise(exercise.id)}
                  type="button"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <input className="input" value={exercise.name} onChange={(event) => updateExercise(exercise.id, { name: event.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Series</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={exercise.sets}
                    onChange={(event) => updateExercise(exercise.id, { sets: parseNumericInput(event.target.value) })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Reps</span>
                  <input className="input" value={exercise.reps} onChange={(event) => updateExercise(exercise.id, { reps: event.target.value })} />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Descanso</span>
                  <input className="input" value={exercise.rest} onChange={(event) => updateExercise(exercise.id, { rest: event.target.value })} />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>RIR</span>
                  <input className="input" value={exercise.rir ?? ''} onChange={(event) => updateExercise(exercise.id, { rir: event.target.value })} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Progressao</span>
                  <select
                    className="input"
                    value={exercise.progressionType}
                    onChange={(event) => updateExercise(exercise.id, { progressionType: event.target.value as Exercise['progressionType'] })}
                  >
                    <option value="large">Composto</option>
                    <option value="isolation">Isolador</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm font-bold text-slate-100">
                  <input
                    className="h-5 w-5 accent-teal-500"
                    type="checkbox"
                    checked={Boolean(exercise.unilateral)}
                    onChange={(event) => updateExercise(exercise.id, { unilateral: event.target.checked })}
                  />
                  Por perna
                </label>
              </div>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                <span>Nota</span>
                <textarea
                  className="input min-h-20 resize-none"
                  value={exercise.note ?? ''}
                  onChange={(event) => updateExercise(exercise.id, { note: event.target.value })}
                />
              </label>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Musculos-alvo</p>
                <button className="text-xs font-bold text-teal-300" type="button" onClick={() => addTarget(exercise.id)}>
                  Adicionar alvo
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {exercise.targets.map((target, targetIndex) => (
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={`${exercise.id}-${target.muscle}-${target.role}-${targetIndex}`}>
                    <select
                      className="input"
                      value={target.muscle}
                      onChange={(event) => updateExerciseTarget(exercise.id, targetIndex, { muscle: event.target.value as MuscleGroup })}
                    >
                      {muscleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input"
                      value={target.role}
                      onChange={(event) => updateExerciseTarget(exercise.id, targetIndex, { role: event.target.value as ExerciseTarget['role'] })}
                    >
                      <option value="primary">Principal 1x</option>
                      <option value="secondary">Secundario 0,5x</option>
                    </select>
                    <button
                      aria-label={`Remover alvo ${getMuscleLabel(target.muscle)}`}
                      className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300"
                      disabled={exercise.targets.length <= 1}
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
        ))}
      </div>

      <button className="secondary-button mt-4 w-full border-rose-400/30 text-rose-100" disabled={workouts.length <= 1} type="button" onClick={removeWorkout}>
        <Trash2 size={18} aria-hidden="true" />
        Remover treino selecionado
      </button>
    </Card>
  );
}

export function Workout({
  data,
  todayChecks,
  todayPlan,
  onExerciseLogChange,
  onToggleCheck,
  onWeekPlanChange,
  onWorkoutsChange,
}: WorkoutProps) {
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(todayPlan.workoutId ?? data.workouts[0].id);
  const [isEditing, setIsEditing] = useState(false);
  const selectedWorkout = getWorkoutById(selectedWorkoutId, data.workouts) ?? data.workouts[0];
  const weeklyChecks = useMemo(() => getWeekCheckEntries(data.dailyChecks), [data.dailyChecks]);
  const trainingAdherence = calculateAdherence(weeklyChecks, 'trainingDone', data.profile.trainingDays);
  const cardioAdherence = calculateAdherence(weeklyChecks, 'cardioDone', data.profile.cardioDays);
  const weeklyVolume = useMemo(() => calculateWeeklyVolume(data.workouts, data.weekPlan), [data.weekPlan, data.workouts]);

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <p className="text-sm font-semibold text-rose-700">Bom treino, {data.profile.name}</p>
        <h1 className="page-title mt-1">Treino</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Rotina editavel com alertas de volume para cutting.</p>
      </header>

      <div className="grid gap-3">
        <Card>
          <div className="flex items-center gap-2">
            <CalendarDays className="text-rose-700" size={20} aria-hidden="true" />
            <h2 className="section-title">Semana</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {data.weekPlan.map((item) => (
              <button
                type="button"
                className={`rounded-lg border p-3 text-left transition ${
                  selectedWorkout?.id === item.workoutId
                    ? 'border-rose-300 bg-rose-50 text-rose-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
                key={item.dayLabel}
                onClick={() => item.workoutId && setSelectedWorkoutId(item.workoutId)}
              >
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.dayLabel}</span>
                <span className="mt-1 block text-sm font-bold">{item.title}</span>
                {item.cardio ? <span className="mt-1 block text-xs font-semibold text-teal-700">{item.cardio}</span> : null}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="section-title">Aderencia semanal</h2>
          <div className="mt-4 space-y-4">
            <ProgressBar value={trainingAdherence} label="Treinos" tone="rose" />
            <ProgressBar value={cardioAdherence} label="Cardios" tone="teal" />
          </div>
        </Card>
      </div>

      <VolumePanel volume={weeklyVolume} />

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="section-title">Hoje</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{todayPlan.title}</p>
          </div>
          {todayPlan.cardio ? <HeartPulse className="text-teal-700" size={22} aria-hidden="true" /> : null}
        </div>
        <div className="mt-4 grid gap-2">
          {todayPlan.workoutId ? (
            <button
              type="button"
              className={todayChecks.trainingDone ? 'primary-button bg-teal-700' : 'secondary-button'}
              onClick={() => onToggleCheck('trainingDone')}
            >
              {todayChecks.trainingDone ? 'Treino concluido' : 'Marcar treino de hoje'}
            </button>
          ) : null}
          {todayPlan.cardio ? (
            <button
              type="button"
              className={todayChecks.cardioDone ? 'primary-button bg-teal-700' : 'secondary-button'}
              onClick={() => onToggleCheck('cardioDone')}
            >
              {todayChecks.cardioDone ? 'Cardio concluido' : 'Marcar cardio de hoje'}
            </button>
          ) : null}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="section-title">{selectedWorkout.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{selectedWorkout.focus}</p>
        </div>
        <button className="secondary-button shrink-0 px-3" type="button" onClick={() => setIsEditing((current) => !current)}>
          <Pencil size={18} aria-hidden="true" />
          {isEditing ? 'Fechar' : 'Editar'}
        </button>
      </div>

      {isEditing ? (
        <WorkoutEditor
          selectedWorkout={selectedWorkout}
          selectedWorkoutId={selectedWorkout.id}
          weekPlan={data.weekPlan}
          workouts={data.workouts}
          onSelectWorkout={setSelectedWorkoutId}
          onWeekPlanChange={onWeekPlanChange}
          onWorkoutsChange={onWorkoutsChange}
        />
      ) : null}

      <section className="space-y-3">
        {selectedWorkout.exercises.map((exercise) => (
          <ExerciseCard exercise={exercise} key={exercise.id} log={data.exerciseLogs[exercise.id]} onChange={onExerciseLogChange} />
        ))}
      </section>
    </div>
  );
}
