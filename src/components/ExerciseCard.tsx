import { Check, Dumbbell } from 'lucide-react';
import type { Exercise, ExerciseLog } from '../types';
import { getExerciseFeedback } from '../utils/progressRules';
import { Card } from './Card';

type ExerciseCardProps = {
  exercise: Exercise;
  log?: ExerciseLog;
  onChange: (exerciseId: string, log: ExerciseLog) => void;
};

const defaultLog: ExerciseLog = {
  weight: '',
  reps: '',
  setsDone: '',
  rir: '',
  note: '',
  done: false,
};

export function ExerciseCard({ exercise, log = defaultLog, onChange }: ExerciseCardProps) {
  const updateLog = (changes: Partial<ExerciseLog>) => {
    onChange(exercise.id, { ...defaultLog, ...log, ...changes });
  };

  return (
    <Card className={log.done ? 'border-teal-200 bg-teal-50/60' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Dumbbell className="text-rose-700" size={18} aria-hidden="true" />
            <h3 className="text-base font-semibold leading-tight text-slate-950">{exercise.name}</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {exercise.sets} · {exercise.reps} · Descanso {exercise.rest}
            {exercise.rir ? ` · ${exercise.rir}` : ''}
          </p>
          {exercise.note ? <p className="mt-2 text-sm text-slate-500">{exercise.note}</p> : null}
        </div>
        <button
          type="button"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition ${
            log.done ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-500'
          }`}
          onClick={() => updateLog({ done: !log.done })}
          aria-label={log.done ? 'Desmarcar exercício' : 'Marcar exercício'}
          title={log.done ? 'Desmarcar exercício' : 'Marcar exercício'}
        >
          <Check size={19} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Carga</span>
          <input
            className="input"
            inputMode="decimal"
            placeholder="kg"
            value={log.weight}
            onChange={(event) => updateLog({ weight: event.target.value })}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Reps</span>
          <input
            className="input"
            inputMode="numeric"
            placeholder="ex: 10"
            value={log.reps}
            onChange={(event) => updateLog({ reps: event.target.value })}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Séries feitas</span>
          <input
            className="input"
            inputMode="numeric"
            placeholder="ex: 4"
            value={log.setsDone}
            onChange={(event) => updateLog({ setsDone: event.target.value })}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>RIR</span>
          <input
            className="input"
            inputMode="numeric"
            placeholder="1-2"
            value={log.rir}
            onChange={(event) => updateLog({ rir: event.target.value })}
          />
        </label>
      </div>

      <label className="mt-3 block space-y-1 text-sm font-medium text-slate-700">
        <span>Observacao</span>
        <textarea
          className="input min-h-20 resize-none"
          placeholder="Como foi a execução?"
          value={log.note}
          onChange={(event) => updateLog({ note: event.target.value })}
        />
      </label>

      <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700">{getExerciseFeedback(exercise, log)}</p>
    </Card>
  );
}
