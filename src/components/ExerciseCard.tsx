import { Check, ChevronDown, Copy, Dumbbell, Info, Plus, StickyNote, Trash2, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRestTimer } from '../hooks/useRestTimer';
import type { Exercise, ExerciseLog, ExerciseSetLog } from '../types';
import { getExerciseFeedback } from '../utils/progressRules';
import {
  getRepeatSetReference,
  hasSetValues,
  parseRestSeconds,
  validateSetCompletion,
} from '../utils/workoutExperience';
import { getMuscleLabel } from '../utils/workoutVolume';
import '../workout-refresh.css';

type ExerciseCardProps = {
  exercise: Exercise;
  log: ExerciseLog;
  previousLog?: ExerciseLog;
  defaultExpanded?: boolean;
  readOnly?: boolean;
  onChange: (exerciseId: string, log: ExerciseLog) => void;
};

function createSetId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `set-${crypto.randomUUID()}`;
  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function setSummary(set?: ExerciseSetLog) {
  if (!set || !hasSetValues(set)) return '—';
  return (
    [set.weight ? `${set.weight} kg` : null, set.reps ? `${set.reps} reps` : null].filter(Boolean).join(' × ') || '—'
  );
}

export function ExerciseCard({
  exercise,
  log,
  previousLog,
  defaultExpanded = false,
  readOnly = false,
  onChange,
}: ExerciseCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [validation, setValidation] = useState<{
    index: number;
    message: string;
  } | null>(null);
  const { startRest } = useRestTimer();
  const completedCount = log.sets.slice(0, log.plannedSetCount).filter((set) => set.completed).length;
  const extraSetCount = Math.max(0, log.sets.length - log.plannedSetCount);
  const isComplete = log.plannedSetCount > 0 && completedCount === log.plannedSetCount;
  const previousSummary = useMemo(
    () =>
      setSummary(
        previousLog?.sets.find((set) => set.completed && hasSetValues(set)) ?? previousLog?.sets.find(hasSetValues),
      ),
    [previousLog],
  );
  const instructionsId = `instructions-${exercise.id}`;

  const updateLog = (changes: Partial<ExerciseLog>) => {
    if (!readOnly) onChange(exercise.id, { ...log, ...changes });
  };

  const updateSet = (index: number, changes: Partial<ExerciseSetLog>) => {
    if (readOnly) return;
    const nextSet = { ...log.sets[index], ...changes };
    const error = changes.completed ? validateSetCompletion(nextSet) : null;
    if (error) {
      setValidation({ index, message: error });
      return;
    }
    setValidation(null);
    updateLog({
      sets: log.sets.map((set, setIndex) => (setIndex === index ? { ...set, ...changes } : set)),
    });
    if (changes.completed && !log.sets[index]?.completed) {
      startRest({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        durationSeconds: parseRestSeconds(exercise.rest),
      });
    }
  };

  const addSet = () => {
    if (readOnly) return;
    const reference = getRepeatSetReference(log, log.sets.length, previousLog);
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
    const reference = getRepeatSetReference(log, index, previousLog);
    if (reference)
      updateSet(index, {
        weight: reference.weight,
        reps: reference.reps,
        rir: reference.rir,
      });
  };

  const removeSet = (index: number) => {
    if (readOnly || index < log.plannedSetCount) return;
    const set = log.sets[index];
    if ((set.completed || hasSetValues(set)) && !window.confirm(`Remover a série ${index + 1} e seus dados?`)) return;
    updateLog({ sets: log.sets.filter((_, setIndex) => setIndex !== index) });
  };

  return (
    <article className={`af-exercise ${isComplete ? 'is-complete' : ''}`}>
      <button
        type="button"
        className="af-exercise-heading"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        aria-controls={`sets-${exercise.id}`}
      >
        <span className="af-exercise-icon">
          {isComplete ? <Check size={21} aria-hidden="true" /> : <Dumbbell size={21} aria-hidden="true" />}
        </span>
        <span className="af-exercise-title">
          <strong>{exercise.name}</strong>
          <span>
            {log.plannedSetCount} séries{exercise.unilateral ? ' por lado' : ''} · {exercise.reps} ·{' '}
            {exercise.rest || 'Descanso livre'}
          </span>
        </span>
        <span className="af-exercise-count">
          {completedCount}/{log.plannedSetCount}
        </span>
        <ChevronDown className={isExpanded ? 'af-chevron is-open' : 'af-chevron'} size={18} aria-hidden="true" />
      </button>

      {isExpanded ? (
        <div className="af-exercise-content" id={`sets-${exercise.id}`}>
          <div className="af-exercise-tags">
            {exercise.targets
              .filter((target) => target.role === 'primary')
              .map((target, index) => (
                <span key={`${target.muscle}-${index}`}>{getMuscleLabel(target.muscle)}</span>
              ))}
            {exercise.unilateral ? <span>Unilateral</span> : null}
            {extraSetCount ? (
              <span>
                +{extraSetCount} {extraSetCount === 1 ? 'série extra' : 'séries extras'}
              </span>
            ) : null}
          </div>
          <div className="af-previous-session">
            <TrendingUp size={15} aria-hidden="true" />
            <span>
              {previousSummary !== '—' ? (
                <>
                  Última sessão <strong>{previousSummary}</strong>
                </>
              ) : (
                'Primeira vez? Registre sua carga de partida.'
              )}
            </span>
          </div>

          <div className="af-set-table" aria-label={`Séries de ${exercise.name}`}>
            <div className="af-set-grid af-set-labels" aria-hidden="true">
              <span>Série</span>
              <span>Anterior</span>
              <span>Kg</span>
              <span>Reps</span>
              <span>Feito</span>
            </div>
            {log.sets.map((set, index) => {
              const previousSet = previousLog?.sets[index] ?? previousLog?.sets[previousLog.sets.length - 1];
              const repeatReference = getRepeatSetReference(log, index, previousLog);
              return (
                <fieldset className={`af-set-row ${set.completed ? 'is-complete' : ''}`} key={set.id}>
                  <legend className="sr-only">
                    Série {index + 1} de {exercise.name}
                  </legend>
                  <div className="af-set-grid">
                    <span
                      className="af-set-number"
                      title={index >= log.plannedSetCount ? 'Série extra' : 'Série planejada'}
                    >
                      {index + 1}
                      {index >= log.plannedSetCount ? <small>+</small> : null}
                    </span>
                    <span className="af-set-previous" aria-label={`Sessão anterior: ${setSummary(previousSet)}`}>
                      {previousSet?.weight || previousSet?.reps ? (
                        <>
                          {previousSet.weight || '—'}
                          <small>× {previousSet.reps || '—'}</small>
                        </>
                      ) : (
                        '—'
                      )}
                    </span>
                    <input
                      className="af-set-input"
                      inputMode="decimal"
                      placeholder={previousSet?.weight || '—'}
                      value={set.weight}
                      readOnly={readOnly || set.completed}
                      title={set.completed && !readOnly ? 'Desmarque a série para corrigir a carga.' : undefined}
                      onChange={(event) => updateSet(index, { weight: event.target.value })}
                      aria-label={`Carga da série ${index + 1} em quilos`}
                      autoComplete="off"
                    />
                    <input
                      className="af-set-input"
                      inputMode="numeric"
                      placeholder={previousSet?.reps || '—'}
                      value={set.reps}
                      readOnly={readOnly || set.completed}
                      title={set.completed && !readOnly ? 'Desmarque a série para corrigir as repetições.' : undefined}
                      onChange={(event) => updateSet(index, { reps: event.target.value })}
                      aria-label={`Repetições da série ${index + 1}`}
                      autoComplete="off"
                    />
                    <button
                      className={`af-set-check ${set.completed ? 'is-complete' : ''}`}
                      type="button"
                      disabled={readOnly}
                      onClick={() => updateSet(index, { completed: !set.completed })}
                      aria-pressed={set.completed}
                      aria-label={set.completed ? `Desmarcar série ${index + 1}` : `Concluir série ${index + 1}`}
                    >
                      <Check size={20} aria-hidden="true" />
                    </button>
                  </div>
                  {validation?.index === index && (
                    <p className="af-set-error" role="alert">
                      {validation.message}
                    </p>
                  )}
                  {!readOnly && (repeatReference || index >= log.plannedSetCount) ? (
                    <div className="af-set-tools">
                      {repeatReference ? (
                        <button
                          className="af-text-button"
                          type="button"
                          disabled={set.completed}
                          onClick={() => copyPreviousSet(index)}
                          aria-label={`Repetir valores anteriores na série ${index + 1}`}
                        >
                          <Copy size={12} aria-hidden="true" /> Repetir {index === 0 ? 'última sessão' : 'anterior'}
                        </button>
                      ) : (
                        <span />
                      )}
                      {index >= log.plannedSetCount ? (
                        <button
                          className="af-remove-set"
                          type="button"
                          onClick={() => removeSet(index)}
                          aria-label={`Remover série ${index + 1}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </fieldset>
              );
            })}
          </div>
          {!readOnly ? (
            <button className="af-add-set" type="button" onClick={addSet}>
              <Plus size={16} aria-hidden="true" /> Adicionar série extra
            </button>
          ) : null}

          <details className="af-exercise-details" open={undefined}>
            <summary>
              <StickyNote size={15} aria-hidden="true" />
              <span>Esforço e observações{log.note ? ' · com nota' : ''}</span>
              <ChevronDown size={15} aria-hidden="true" />
            </summary>
            <div className="af-detail-body">
              <p>
                RIR é quantas repetições você ainda conseguiria fazer.
                {exercise.rir ? ` Meta: ${exercise.rir}.` : ''}
              </p>
              <div className="af-rir-grid">
                {log.sets.map((set, index) => (
                  <label key={set.id}>
                    <span>Série {index + 1}</span>
                    <input
                      className="af-set-input"
                      inputMode="numeric"
                      placeholder="RIR"
                      value={set.rir}
                      readOnly={readOnly}
                      onChange={(event) => updateSet(index, { rir: event.target.value })}
                      aria-label={`RIR da série ${index + 1}`}
                    />
                  </label>
                ))}
              </div>
              <label className="af-note-label">
                <span>Nota do exercício</span>
                <textarea
                  className="af-note-input"
                  placeholder="Como foi? Algum ajuste para a próxima?"
                  value={log.note}
                  readOnly={readOnly}
                  onChange={(event) => updateLog({ note: event.target.value })}
                />
              </label>
              <p className="af-smart-feedback" aria-live="polite">
                {getExerciseFeedback(exercise, log)}
              </p>
            </div>
          </details>
          {exercise.note ? (
            <details className="af-exercise-details" id={instructionsId}>
              <summary>
                <Info size={15} aria-hidden="true" />
                <span>Ver orientações</span>
                <ChevronDown size={15} aria-hidden="true" />
              </summary>
              <div className="af-detail-body">
                <p>{exercise.note}</p>
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
