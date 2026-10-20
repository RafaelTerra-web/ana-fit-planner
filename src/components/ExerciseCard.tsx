import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Dumbbell,
  Info,
  Minus,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useRestTimer } from '../hooks/useRestTimer';
import type { Exercise, ExerciseLog, ExerciseSetLog } from '../types';
import { getExerciseFeedback } from '../utils/progressRules';
import {
  getRepeatSetReference,
  adjustSetValue,
  fillEmptySetsFromHistory,
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
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onNextExercise?: () => void;
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
  expanded,
  onExpandedChange,
  onNextExercise,
  readOnly = false,
  onChange,
}: ExerciseCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;
  const setIsExpanded = (next: boolean) => {
    setInternalExpanded(next);
    onExpandedChange?.(next);
  };
  const [weightStep, setWeightStep] = useState(exercise.progressionType === 'isolation' ? 1 : 2.5);
  const [announcement, setAnnouncement] = useState('');
  const pendingCompletions = useRef(new Set<string>());
  const [validation, setValidation] = useState<{
    index: number;
    message: string;
  } | null>(null);
  const { timer, startRest, skipRest } = useRestTimer();
  const activeSetIndex = log.sets.findIndex((set) => !set.completed);
  const historyFilledLog = fillEmptySetsFromHistory(log, previousLog);
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
    const currentSet = log.sets[index];
    if (changes.completed && (currentSet.completed || pendingCompletions.current.has(currentSet.id))) return;
    const nextSet = { ...log.sets[index], ...changes };
    const error = changes.completed ? validateSetCompletion(nextSet) : null;
    if (error) {
      setValidation({ index, message: error });
      return;
    }
    setValidation(null);
    if (changes.completed) pendingCompletions.current.add(currentSet.id);
    if (changes.completed === false) {
      pendingCompletions.current.delete(currentSet.id);
      if (timer?.setId === currentSet.id && timer.exerciseId === exercise.id) skipRest();
    }
    updateLog({
      sets: log.sets.map((set, setIndex) => (setIndex === index ? { ...set, ...changes } : set)),
    });
    if (changes.completed && !log.sets[index]?.completed) {
      startRest({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        durationSeconds: parseRestSeconds(exercise.rest),
        setId: currentSet.id,
      });
      setAnnouncement(`Série ${index + 1} salva.${parseRestSeconds(exercise.rest) > 0 ? ' Descanso iniciado.' : ''}`);
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
    <article className={`af-exercise ${isComplete ? 'is-complete' : ''}`} id={`workout-exercise-${exercise.id}`}>
      <button
        type="button"
        className="af-exercise-heading"
        onClick={() => setIsExpanded(!isExpanded)}
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
          {!readOnly && historyFilledLog !== log && (
            <button
              className="gym-history-fill"
              type="button"
              onClick={() => updateLog({ sets: historyFilledLog.sets })}
            >
              <Copy size={16} aria-hidden="true" /> Preencher séries vazias com a última sessão
            </button>
          )}
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
                <fieldset
                  className={`af-set-row ${set.completed ? 'is-complete' : ''} ${index === activeSetIndex ? 'is-current' : ''}`}
                  key={set.id}
                  id={`workout-set-${exercise.id}-${set.id}`}
                >
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
                      title={set.completed && !readOnly ? 'Toque em Corrigir para alterar a carga.' : undefined}
                      onChange={(event) => updateSet(index, { weight: event.target.value })}
                      aria-label={`Carga da série ${index + 1} em quilos`}
                      autoComplete="off"
                      enterKeyHint="next"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          document.getElementById(`reps-${exercise.id}-${set.id}`)?.focus();
                        }
                      }}
                    />
                    <input
                      className="af-set-input"
                      inputMode="numeric"
                      placeholder={previousSet?.reps || '—'}
                      value={set.reps}
                      readOnly={readOnly || set.completed}
                      title={set.completed && !readOnly ? 'Toque em Corrigir para alterar as repetições.' : undefined}
                      onChange={(event) => updateSet(index, { reps: event.target.value })}
                      aria-label={`Repetições da série ${index + 1}`}
                      autoComplete="off"
                      id={`reps-${exercise.id}-${set.id}`}
                      enterKeyHint="done"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !readOnly && !set.completed) {
                          event.preventDefault();
                          updateSet(index, { completed: true });
                          event.currentTarget.blur();
                        }
                      }}
                    />
                    <button
                      className={`af-set-check ${set.completed ? 'is-complete' : ''}`}
                      type="button"
                      disabled={readOnly || set.completed}
                      onClick={() => updateSet(index, { completed: true })}
                      aria-pressed={set.completed}
                      aria-label={set.completed ? `Série ${index + 1} concluída` : `Concluir série ${index + 1}`}
                    >
                      <Check size={20} aria-hidden="true" />
                    </button>
                  </div>
                  {validation?.index === index && (
                    <p className="af-set-error" role="alert">
                      {validation.message}
                    </p>
                  )}
                  {!readOnly && index === activeSetIndex && activeSetIndex >= 0 && (
                    <div className="gym-quick-adjust" aria-label={`Ajustar série ${activeSetIndex + 1}`}>
                      <div className="gym-adjust-heading">
                        <strong>Série {activeSetIndex + 1} · ajuste rápido</strong>
                        <label>
                          <span>Passo da carga</span>
                          <select
                            aria-label="Passo de ajuste da carga"
                            value={weightStep}
                            onChange={(event) => setWeightStep(Number(event.target.value))}
                          >
                            {[0.5, 1, 2.5, 5].map((step) => (
                              <option key={step} value={step}>
                                {String(step).replace('.', ',')} kg
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="gym-adjust-controls">
                        <div>
                          <span>Carga</span>
                          <button
                            type="button"
                            aria-label={`Diminuir carga em ${weightStep} kg na série ${activeSetIndex + 1}`}
                            onClick={() =>
                              updateSet(activeSetIndex, {
                                weight: adjustSetValue(
                                  log.sets[activeSetIndex].weight ||
                                    getRepeatSetReference(log, activeSetIndex, previousLog)?.weight ||
                                    '0',
                                  -weightStep,
                                  'weight',
                                ),
                              })
                            }
                          >
                            <Minus size={17} />
                          </button>
                          <b>
                            {log.sets[activeSetIndex].weight || '—'}
                            <small> kg</small>
                          </b>
                          <button
                            type="button"
                            aria-label={`Aumentar carga em ${weightStep} kg na série ${activeSetIndex + 1}`}
                            onClick={() =>
                              updateSet(activeSetIndex, {
                                weight: adjustSetValue(
                                  log.sets[activeSetIndex].weight ||
                                    getRepeatSetReference(log, activeSetIndex, previousLog)?.weight ||
                                    '0',
                                  weightStep,
                                  'weight',
                                ),
                              })
                            }
                          >
                            <Plus size={17} />
                          </button>
                        </div>
                        <div>
                          <span>Reps</span>
                          <button
                            type="button"
                            aria-label={`Diminuir repetições na série ${activeSetIndex + 1}`}
                            onClick={() =>
                              updateSet(activeSetIndex, {
                                reps: adjustSetValue(
                                  log.sets[activeSetIndex].reps ||
                                    getRepeatSetReference(log, activeSetIndex, previousLog)?.reps ||
                                    '0',
                                  -1,
                                  'reps',
                                ),
                              })
                            }
                          >
                            <Minus size={17} />
                          </button>
                          <b>{log.sets[activeSetIndex].reps || '—'}</b>
                          <button
                            type="button"
                            aria-label={`Aumentar repetições na série ${activeSetIndex + 1}`}
                            onClick={() =>
                              updateSet(activeSetIndex, {
                                reps: adjustSetValue(
                                  log.sets[activeSetIndex].reps ||
                                    getRepeatSetReference(log, activeSetIndex, previousLog)?.reps ||
                                    '0',
                                  1,
                                  'reps',
                                ),
                              })
                            }
                          >
                            <Plus size={17} />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="af-text-button"
                        onClick={() => updateSet(activeSetIndex, { weight: '0' })}
                      >
                        Sem carga externa · 0 kg
                      </button>
                    </div>
                  )}

                  {!readOnly && (repeatReference || set.completed || index >= log.plannedSetCount) ? (
                    <div className="af-set-tools">
                      {set.completed ? (
                        <button
                          type="button"
                          className="af-text-button gym-correct-set"
                          onClick={() => {
                            updateSet(index, { completed: false });
                            setAnnouncement(`Série ${index + 1} liberada para correção.`);
                          }}
                          aria-label={`Corrigir série ${index + 1}`}
                        >
                          <Pencil size={13} aria-hidden="true" /> Corrigir
                        </button>
                      ) : repeatReference ? (
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
          {!readOnly && (
            <p className="gym-series-status" role="status" aria-live="polite">
              {announcement}
            </p>
          )}
          {!readOnly && isComplete && onNextExercise && (
            <button className="gym-next-exercise" type="button" onClick={onNextExercise}>
              Próximo exercício <ArrowRight size={17} aria-hidden="true" />
            </button>
          )}
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
