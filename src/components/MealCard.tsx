import { Check, Utensils } from 'lucide-react';
import type { Meal } from '../types';
import { normalizeMealDayApplicability } from '../utils/meals';
import { Card } from './Card';

type MealCardProps = {
  meal: Meal;
  done?: boolean;
  editable?: boolean;
  showMacros?: boolean;
  onToggle?: () => void;
  onChange?: (meal: Meal) => void;
};

export function MealCard({ meal, done = false, editable = false, showMacros = true, onToggle, onChange }: MealCardProps) {
  const applicability = normalizeMealDayApplicability(meal.appliesTo);
  const applicabilityLabel = applicability === 'training' ? 'Só em treino' : applicability === 'rest' ? 'Só em descanso' : null;
  const updateMeal = (changes: Partial<Meal>) => {
    onChange?.({ ...meal, ...changes });
  };

  return (
    <Card className={done ? 'border-teal-200 bg-teal-50/60' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Utensils className="text-rose-700" size={18} aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-950">{meal.title}</h3>
            {meal.optional ? (
              <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-200">
                Opcional
              </span>
            ) : null}
            {applicabilityLabel ? (
              <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-teal-200">
                {applicabilityLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">{meal.time}</p>
        </div>
        {onToggle ? (
          <button
            type="button"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition ${
              done ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-500'
            }`}
            onClick={onToggle}
            aria-label={`${done ? 'Desmarcar' : 'Marcar'} refeição${meal.optional ? ' opcional' : ''}`}
            title={done ? 'Desmarcar refeição' : 'Marcar refeição'}
          >
            <Check size={19} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {editable ? (
        <div className="mt-4 space-y-3">
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            <span>Alimentos</span>
            <textarea
              className="input min-h-28 resize-none"
              value={meal.items.join('\n')}
              onChange={(event) =>
                updateMeal({
                  items: event.target.value
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Calorias</span>
              <input
                className="input"
                inputMode="numeric"
                value={meal.calories}
                onChange={(event) => updateMeal({ calories: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Proteína</span>
              <input
                className="input"
                inputMode="numeric"
                value={meal.protein}
                onChange={(event) => updateMeal({ protein: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Carboidratos</span>
              <input
                className="input"
                inputMode="numeric"
                value={meal.carbs}
                onChange={(event) => updateMeal({ carbs: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Gorduras</span>
              <input
                className="input"
                inputMode="numeric"
                value={meal.fat}
                onChange={(event) => updateMeal({ fat: Number(event.target.value) || 0 })}
              />
            </label>
          </div>
        </div>
      ) : (
        <>
          {meal.items.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
              {meal.items.map((item) => (
                <li className="flex gap-2" key={item}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {meal.options?.length ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Opções e substituições</p>
              {meal.options.map((option) => (
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3" key={option.id}>
                  <p className="text-sm font-extrabold text-slate-100">{option.title}</p>
                  <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-400">
                    {option.items.map((item) => (
                      <li className="flex gap-2" key={item}>
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {option.note ? <p className="mt-2 text-xs leading-relaxed text-slate-500">{option.note}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}

      {showMacros ? (
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {typeof meal.calories === 'number' ? <span className="rounded-lg bg-rose-50 px-3 py-1 font-semibold text-rose-700">{meal.calories} kcal</span> : null}
          {typeof meal.protein === 'number' ? <span className="rounded-lg bg-teal-50 px-3 py-1 font-semibold text-teal-700">{meal.protein} g proteína</span> : null}
          {typeof meal.carbs === 'number' ? <span className="rounded-lg bg-amber-50 px-3 py-1 font-semibold text-amber-700">{meal.carbs} g carbo</span> : null}
          {typeof meal.fat === 'number' ? <span className="rounded-lg bg-slate-100 px-3 py-1 font-semibold text-slate-700">{meal.fat} g gordura</span> : null}
        </div>
      ) : null}

      {meal.note ? <p className="mt-3 text-sm leading-relaxed text-slate-500">{meal.note}</p> : null}
    </Card>
  );
}
