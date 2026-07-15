import { Check, ChevronDown, Copy, Dumbbell, Plus, TimerReset, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Exercise, ExerciseLog, ExerciseSetLog } from '../types';
import { getExerciseFeedback } from '../utils/progressRules';
import { getMuscleLabel } from '../utils/workoutVolume';
import { Card } from './Card';

type ExerciseCardProps = {
  exercise: Exercise;
  log: ExerciseLog;
  previousLog?: ExerciseLog;
  defaultExpanded?: boolean;
  readOnly?: boolean;
  onChange: (exerciseId: string, log: ExerciseLog) => void;
};

function createSetId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `set-${crypto.randomUUID()}`;
  }

  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseRestSeconds(value: string) {
  const firstNumber = Number(value.match(/\d+/)?.[0] ?? 0);
  if (!firstNumber) {
    return 0;
  }

  return /min/i.test(value) ? firstNumber * 60 : firstNumber;
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function setSummary(set?: ExerciseSetLog) {
  if (!set || (!set.weight && !set.reps && !set.rir)) {
    return null;
  }

  return [set.weight ? `${set.weight} kg` : null, set.reps ? `${set.reps} reps` : null, set.rir ? `RIR ${set.rir}` : null]
    .filter(Boolean)
    .join(' · ');
}

export function ExerciseCard({ exercise, log, previousLog, defaultExpanded = false, readOnly = false, onChange }: ExerciseCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [restSeconds, setRestSeconds] = useState(0);
  const completedCount = log.sets.slice(0, log.plannedSetCount).filter((set) => set.completed).length;
  const extraSetCount = Math.max(0, log.sets.length - log.plannedSetCount);
  const isComplete = log.plannedSetCount > 0 && completedCount === log.plannedSetCount;
  const previousSummary = useMemo(() => setSummary(previousLog?.sets.find((set) => set.completed) ?? previousLog?.sets[0]), [previousLog]);

  useEffect(() => {
    if (restSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRestSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [restSeconds]);

  const updateLog = (changes: Partial<ExerciseLog>) => {
    if (readOnly) {
      return;
    }
    onChange(exercise.id, { ...log, ...changes });
  };

  const updateSet = (index: number, changes: Partial<ExerciseSetLog>) => {
    const nextSets = log.sets.map((set, setIndex) => (setIndex === index ? { ...set, ...changes } : set));
    updateLog({ sets: nextSets });

    if (changes.completed && !log.sets[index]?.completed) {
      setRestSeconds(parseRestSeconds(exercise.rest));
    }
  };

  const addSet = () => {
    if (readOnly) {
      return;
    }
    const reference = log.sets[log.sets.length - 1];
    updateLog({
      sets: [
        ...log.sets,
        {
          id: createSetId(),
          weight: reference?.weight ?? '',
          reps: reference?.reps ?? '',
          rir: reference?.rir ?? '',
          completed: false,
        },
      ],
    });
    setIsExpanded(true);
  };

  const copyPreviousSet = (index: number) => {
    if (readOnly) {
      return;
    }
    const reference =
      log.sets[index - 1] ??
      previousLog?.sets[index] ??
      (previousLog ? previousLog.sets[previousLog.sets.length - 1] : undefined);
    if (!reference) {
      return;
    }

    updateSet(index, {
      weight: reference.weight,
      reps: reference.reps,
      rir: reference.rir,
    });
  };

  const removeSet = (index: number) => {
    if (readOnly || index < log.plannedSetCount) {
      return;
    }
    const set = log.sets[index];
    const hasData = set.completed || Boolean(set.weight || set.reps || set.rir);
    if (hasData && !window.confirm(`Remover a série ${index + 1} e seus dados?`)) {
      return;
    }

    updateLog({
      sets: log.sets.filter((_, setIndex) => setIndex !== index),
    });
  };

  return (
    <Card className={`exercise-card overflow-hidden p-0 ${isComplete ? 'is-complete' : ''}`} as="article">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-4 text-left"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
      >
        <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isComplete ? 'bg-lime-300 text-slate-950' : 'bg-rose-400/15 text-rose-300'}`}>
          {isComplete ? <Check size={20} aria-hidden="true" /> : <Dumbbell size={19} aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold leading-tight text-slate-50">{exercise.name}</span>
          <span className="mt-1.5 block text-xs font-semibold text-slate-400">
            {completedCount}/{log.plannedSetCount} séries planejadas{extraSetCount ? ` · +${extraSetCount} extra` : ''} · {exercise.reps} · {exercise.rest}
          </span>
        </span>
        <ChevronDown className={`mt-2 shrink-0 text-slate-500 transition ${isExpanded ? 'rotate-180' : ''}`} size={19} aria-hidden="true" />
      </button>

      {isExpanded ? (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {exercise.targets.map((target, index) => (
              <span
                className={`rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-wide ${
                  target.role === 'primary' ? 'bg-rose-400/12 text-rose-200' : 'bg-white/[0.05] text-slate-400'
                }`}
                key={`${exercise.id}-${target.muscle}-${target.role}-${index}`}
              >
                {getMuscleLabel(target.muscle)}
              </span>
            ))}
          </div>

          {exercise.note ? <p className="mt-3 text-sm leading-relaxed text-slate-400">{exercise.note}</p> : null}
          {previousSummary ? (
            <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-300">
              Última sessão: {previousSummary}
            </p>
          ) : null}

          {restSeconds > 0 ? (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-lime-300/25 bg-lime-300/10 px-3 py-2" role="timer" aria-live="polite">
              <span className="flex items-center gap-2 text-sm font-extrabold text-lime-200">
                <TimerReset size={17} aria-hidden="true" /> Descanso {formatTimer(restSeconds)}
              </span>
              <button className="min-h-10 px-2 text-xs font-extrabold text-lime-200" type="button" onClick={() => setRestSeconds(0)}>
                Pular
              </button>
            </div>
          ) : null}

          <div className="mt-4 space-y-2.5" aria-label={`Séries de ${exercise.name}`}>
            {log.sets.map((set, index) => {
              const previousSet =
                previousLog?.sets[index] ?? (previousLog ? previousLog.sets[previousLog.sets.length - 1] : undefined);
              return (
                <fieldset className={`set-row rounded-2xl border p-3 ${set.completed ? 'border-lime-300/25 bg-lime-300/[0.07]' : 'border-white/10 bg-slate-950/35'}`} key={set.id}>
                  <legend className="sr-only">Série {index + 1}</legend>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-100">Série {index + 1}</p>
                      <p className="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">
                        {set.completed ? 'Concluída' : index < log.plannedSetCount ? 'Série planejada' : 'Série extra'}
                      </p>
                    </div>
                    <button
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                        set.completed ? 'border-lime-300 bg-lime-300 text-slate-950' : 'border-white/12 bg-white/[0.04] text-slate-400'
                      }`}
                      type="button"
                      disabled={readOnly}
                      onClick={() => updateSet(index, { completed: !set.completed })}
                      aria-label={set.completed ? `Desmarcar série ${index + 1}` : `Concluir série ${index + 1}`}
                    >
                      <Check size={19} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <label className="space-y-1 text-center text-[0.68rem] font-bold uppercase tracking-wide text-slate-500">
                      <span>kg</span>
                      <input
                        className="set-input"
                        inputMode="decimal"
                        placeholder={previousSet?.weight || '—'}
                        value={set.weight}
                        readOnly={readOnly}
                        onChange={(event) => updateSet(index, { weight: event.target.value })}
                        aria-label={`Carga da série ${index + 1} em quilos`}
                      />
                    </label>
                    <label className="space-y-1 text-center text-[0.68rem] font-bold uppercase tracking-wide text-slate-500">
                      <span>Reps</span>
                      <input
                        className="set-input"
                        inputMode="numeric"
                        placeholder={previousSet?.reps || '—'}
                        value={set.reps}
                        readOnly={readOnly}
                        onChange={(event) => updateSet(index, { reps: event.target.value })}
                        aria-label={`Repetições da série ${index + 1}`}
                      />
                    </label>
                    <label className="space-y-1 text-center text-[0.68rem] font-bold uppercase tracking-wide text-slate-500">
                      <span>RIR</span>
                      <input
                        className="set-input"
                        inputMode="numeric"
                        placeholder={previousSet?.rir || '—'}
                        value={set.rir}
                        readOnly={readOnly}
                        onChange={(event) => updateSet(index, { rir: event.target.value })}
                        aria-label={`RIR da série ${index + 1}`}
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <button
                      className="flex min-h-10 items-center gap-1.5 px-1 text-xs font-bold text-slate-400 disabled:opacity-35"
                      type="button"
                      disabled={readOnly || (index === 0 && !previousSet)}
                      onClick={() => copyPreviousSet(index)}
                    >
                      <Copy size={14} aria-hidden="true" /> Copiar anterior
                    </button>
                    {!readOnly && index >= log.plannedSetCount ? (
                      <button
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:text-rose-300"
                        type="button"
                        onClick={() => removeSet(index)}
                        aria-label={`Remover série ${index + 1}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </fieldset>
              );
            })}
          </div>

          <button className="secondary-button mt-3 w-full" type="button" disabled={readOnly} onClick={addSet}>
            <Plus size={17} aria-hidden="true" /> Adicionar série
          </button>

          <label className="mt-3 block space-y-1.5 text-sm font-bold text-slate-300">
            <span>Nota do exercício</span>
            <textarea
              className="input min-h-20 resize-none"
              placeholder="Técnica, desconforto, ajuste para a próxima…"
              value={log.note}
              readOnly={readOnly}
              onChange={(event) => updateLog({ note: event.target.value })}
            />
          </label>

          <p className="smart-feedback mt-3" aria-live="polite">
            {getExerciseFeedback(exercise, log)}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
