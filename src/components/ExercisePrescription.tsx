import { Check, ChevronDown, Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '../types';
import { normalizePlannedWeight } from '../utils/exerciseCatalog';

export function ExercisePrescription({
  exercise,
  disabled = false,
  onChange,
}: {
  exercise: Exercise;
  disabled?: boolean;
  onChange: (changes: Partial<Exercise>) => void;
}) {
  const [panel, setPanel] = useState<'reps' | 'weight' | 'rest' | null>(null);
  const [step, setStep] = useState(2.5);
  const timed = /\d\s*s\b/.test(exercise.reps);
  const ranges = timed
    ? ['20 a 30 s', '30 a 60 s', '60 a 90 s']
    : ['6 a 8 reps', '8 a 12 reps', '10 a 15 reps', '12 a 20 reps'];
  const weight = exercise.plannedWeightKg;
  const [typedWeight, setTypedWeight] = useState(String(weight ?? ''));
  const weightInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTypedWeight(String(weight ?? ''));
    weightInput.current?.setCustomValidity('');
  }, [weight]);
  const format = (value: number) =>
    new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  return (
    <div className="prescription">
      <div className="prescription-grid">
        <div className="prescription-control">
          <span>Séries</span>
          <div className="prescription-stepper">
            <button
              type="button"
              disabled={disabled || exercise.sets <= 1}
              aria-label={`Diminuir séries de ${exercise.name}`}
              onClick={() => onChange({ sets: Math.max(1, exercise.sets - 1) })}
            >
              <Minus size={15} />
            </button>
            <output aria-label={`Séries de ${exercise.name}`}>{exercise.sets}</output>
            <button
              type="button"
              disabled={disabled || exercise.sets >= 20}
              aria-label={`Aumentar séries de ${exercise.name}`}
              onClick={() => onChange({ sets: Math.min(20, exercise.sets + 1) })}
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
        <div className="prescription-control">
          <span>{timed ? 'Tempo' : 'Repetições'}</span>
          <button
            type="button"
            disabled={disabled}
            className="prescription-value"
            aria-label={`Alterar repetições de ${exercise.name}`}
            aria-expanded={panel === 'reps'}
            onClick={() => setPanel(panel === 'reps' ? null : 'reps')}
          >
            {exercise.reps.replace(/\s*reps\s*/g, '').replace(' a ', '–')}
            <ChevronDown size={13} />
          </button>
        </div>
        <div className="prescription-control">
          <span>
            Carga <small>kg</small>
          </span>
          <div className="prescription-stepper">
            <button
              type="button"
              disabled={disabled || weight === 0}
              aria-label={`Diminuir carga planejada de ${exercise.name}`}
              onClick={() =>
                onChange({ plannedWeightKg: Math.max(0, Math.round(((weight ?? 0) - step) * 100) / 100) })
              }
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              disabled={disabled}
              className="prescription-weight"
              aria-label={`Digitar carga planejada de ${exercise.name}`}
              aria-expanded={panel === 'weight'}
              onClick={() => setPanel(panel === 'weight' ? null : 'weight')}
            >
              {weight === undefined ? '—' : format(weight)}
            </button>
            <button
              type="button"
              disabled={disabled || (weight ?? 0) >= 1000}
              aria-label={`Aumentar carga planejada de ${exercise.name}`}
              onClick={() =>
                onChange({ plannedWeightKg: Math.min(1000, Math.round(((weight ?? 0) + step) * 100) / 100) })
              }
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>
      {panel === 'reps' && (
        <div className="prescription-panel">
          <strong>{timed ? 'Escolha o tempo' : 'Escolha a faixa de repetições'}</strong>
          <div className="prescription-pills">
            {ranges.map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={exercise.reps === value}
                onClick={() => {
                  onChange({ reps: value });
                  setPanel(null);
                }}
              >
                {value.replace(' reps', '')}
                {exercise.reps === value && <Check size={13} />}
              </button>
            ))}
          </div>
          <label>
            Ou digite sua prescrição
            <input
              className="input"
              aria-label={`Repetições personalizadas de ${exercise.name}`}
              value={exercise.reps}
              maxLength={40}
              onChange={(event) => onChange({ reps: event.target.value })}
            />
          </label>
        </div>
      )}
      {panel === 'weight' && (
        <div className="prescription-panel">
          <label>
            Carga planejada em kg
            <input
              className="input"
              ref={weightInput}
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{0,2})?"
              aria-label={`Carga planejada em kg de ${exercise.name}`}
              value={typedWeight}
              placeholder="Sem carga definida"
              onChange={(event) => {
                const value = event.target.value;
                setTypedWeight(value);
                const normalized = normalizePlannedWeight(value);
                event.currentTarget.setCustomValidity(
                  Number(value.replace(',', '.')) > 1000 ? 'Informe uma carga entre 0 e 1000 kg.' : '',
                );
                if (normalized !== undefined || value === '') onChange({ plannedWeightKg: normalized });
              }}
            />
          </label>
          <div className="prescription-pills">
            <button type="button" onClick={() => onChange({ plannedWeightKg: 0 })}>
              Peso corporal · 0 kg
            </button>
            <button type="button" onClick={() => onChange({ plannedWeightKg: undefined })}>
              Definir no treino
            </button>
          </div>
          <span>Passo dos botões</span>
          <div className="prescription-pills">
            {[0.5, 1, 2.5, 5].map((value) => (
              <button type="button" key={value} aria-pressed={step === value} onClick={() => setStep(value)}>
                {format(value)} kg
              </button>
            ))}
          </div>
          <small>A carga será preenchida nas próximas sessões. Confirme cada série ao executar.</small>
        </div>
      )}
      <button
        className="prescription-rest"
        type="button"
        disabled={disabled}
        aria-expanded={panel === 'rest'}
        onClick={() => setPanel(panel === 'rest' ? null : 'rest')}
      >
        Descanso <b>{exercise.rest}</b>
        <ChevronDown size={12} />
      </button>
      {panel === 'rest' && (
        <div className="prescription-panel">
          <div className="prescription-pills">
            {['30 s', '60 s', '90 s', '2 min', '3 min'].map((rest) => (
              <button
                type="button"
                key={rest}
                aria-pressed={exercise.rest === rest}
                onClick={() => {
                  onChange({ rest });
                  setPanel(null);
                }}
              >
                {rest}
              </button>
            ))}
          </div>
          <label>
            Outro intervalo
            <input
              className="input"
              aria-label={`Descanso de ${exercise.name}`}
              value={exercise.rest}
              maxLength={30}
              onChange={(event) => onChange({ rest: event.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
