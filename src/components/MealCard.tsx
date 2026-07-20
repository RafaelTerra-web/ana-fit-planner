import { Check, PencilLine, RotateCcw, SlidersHorizontal, Utensils } from 'lucide-react';
import { useState } from 'react';
import type { Meal, MealPortion, MealPortionOverrides } from '../types';
import {
  formatMealPortion,
  getMealPortionKey,
  getMealPortions,
  hasPortionChanges,
  isMealPortionChanged,
  portionUnits,
} from '../utils/mealPortions';
import { normalizeMealDayApplicability } from '../utils/meals';
import { Card } from './Card';

type MealCardProps = {
  meal: Meal;
  done?: boolean;
  editable?: boolean;
  showMacros?: boolean;
  portionOverrides?: MealPortionOverrides;
  onToggle?: () => void;
  onChange?: (meal: Meal) => void;
  onPortionsChange?: (portionKey: string, portions: MealPortion[]) => void;
};

function portionUnitLabel(unit: string, quantity?: number) {
  if (unit !== 'unidade') return unit;
  return quantity && quantity > 1 ? 'unidades' : 'unidade';
}

function PortionEditor({
  items,
  portionKey,
  overrides,
  onChange,
}: {
  items: string[];
  portionKey: string;
  overrides?: MealPortion[];
  onChange: (portionKey: string, portions: MealPortion[]) => void;
}) {
  const portions = getMealPortions(items, overrides);

  const updatePortion = (itemId: string, changes: Partial<MealPortion>) => {
    const initial = portions.find((portion) => portion.itemId === itemId);
    if (!initial) return;
    const currentOverride = overrides?.find((portion) => portion.itemId === itemId);
    const nextPortion = { ...(currentOverride ?? initial), ...changes };
    onChange(
      portionKey,
      [...(overrides ?? []).filter((portion) => portion.itemId !== itemId), nextPortion],
    );
  };

  return (
    <div className="mt-3 space-y-2 rounded-2xl border border-lime-300/20 bg-lime-300/[0.05] p-3">
      <p className="text-xs font-bold leading-relaxed text-lime-100">
        Ajuste a porção que funciona para você. As estimativas nutricionais não são recalculadas por esta edição.
      </p>
      {portions.map((portion) => (
        <div className="rounded-xl border border-white/10 bg-slate-950/45 p-2.5" key={portion.itemId}>
          <input
            aria-label={`Alimento ${Number(portion.itemId) + 1}`}
            className="input mb-2"
            value={portion.label}
            onChange={(event) => updatePortion(portion.itemId, { label: event.target.value })}
          />
          <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] gap-2">
            <label className="space-y-1 text-xs font-bold text-slate-300">
              <span>Quantidade</span>
              <input
                aria-label={`Quantidade de ${portion.label || `alimento ${Number(portion.itemId) + 1}`}`}
                className="input"
                inputMode="decimal"
                min="0"
                step="0.5"
                type="number"
                value={portion.quantity ?? ''}
                onChange={(event) => {
                  const nextQuantity = Number(event.target.value);
                  updatePortion(portion.itemId, {
                    quantity: Number.isFinite(nextQuantity) && nextQuantity > 0 ? nextQuantity : undefined,
                  });
                }}
              />
            </label>
            <label className="space-y-1 text-xs font-bold text-slate-300">
              <span>Unidade</span>
              <select
                aria-label={`Unidade de ${portion.label || `alimento ${Number(portion.itemId) + 1}`}`}
                className="input"
                value={portion.unit ?? 'unidade'}
                onChange={(event) => updatePortion(portion.itemId, { unit: event.target.value })}
              >
                {portionUnits.map((unit) => (
                  <option key={unit} value={unit}>{portionUnitLabel(unit, portion.quantity)}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MealCard({
  meal,
  done = false,
  editable = false,
  showMacros = true,
  portionOverrides,
  onToggle,
  onChange,
  onPortionsChange,
}: MealCardProps) {
  const [editingPortions, setEditingPortions] = useState(false);
  const applicability = normalizeMealDayApplicability(meal.appliesTo);
  const applicabilityLabel = applicability === 'training' ? 'Só em treino' : applicability === 'rest' ? 'Só em descanso' : null;
  const primaryPortionKey = getMealPortionKey(meal.id);
  const primaryOverrides = portionOverrides?.[primaryPortionKey];
  const primaryIsCustomized = hasPortionChanges(meal.items, primaryOverrides);
  const updateMeal = (changes: Partial<Meal>) => {
    onChange?.({ ...meal, ...changes });
  };

  const renderPortionList = (items: string[], portionKey: string, tone: 'rose' | 'teal') => {
    const portions = getMealPortions(items, portionOverrides?.[portionKey]);
    const overridesById = new Map((portionOverrides?.[portionKey] ?? []).map((portion) => [portion.itemId, portion]));
    const isCustomized = hasPortionChanges(items, portionOverrides?.[portionKey]);
    const dotClass = tone === 'rose' ? 'bg-rose-500' : 'bg-teal-300';

    return items.length > 0 ? (
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
        {portions.map((portion, index) => (
          <li className="flex gap-2" key={`${portion.itemId}:${items[index]}`}>
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
            <span>{isMealPortionChanged(items[index], overridesById.get(portion.itemId)) ? formatMealPortion(portion, items[index]) : items[index]}</span>
          </li>
        ))}
        {isCustomized ? <li className="pl-3.5 text-xs font-semibold text-lime-200">Porção personalizada</li> : null}
      </ul>
    ) : null;
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
        <div className="flex shrink-0 items-center gap-2">
          {onPortionsChange && (meal.items.length > 0 || meal.options?.some((option) => option.items.length > 0)) ? (
            <button
              aria-expanded={editingPortions}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${
                editingPortions || primaryIsCustomized
                  ? 'border-lime-300/45 bg-lime-300/15 text-lime-100'
                  : 'border-white/10 bg-white/[0.04] text-slate-300'
              }`}
              onClick={() => setEditingPortions((current) => !current)}
              title="Ajustar quantidades"
              type="button"
            >
              <SlidersHorizontal size={18} aria-hidden="true" />
              <span className="sr-only">Ajustar quantidades</span>
            </button>
          ) : null}
          {onToggle ? (
            <button
              type="button"
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${
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
              <input className="input" inputMode="numeric" value={meal.calories} onChange={(event) => updateMeal({ calories: Number(event.target.value) || 0 })} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Proteína</span>
              <input className="input" inputMode="numeric" value={meal.protein} onChange={(event) => updateMeal({ protein: Number(event.target.value) || 0 })} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Carboidratos</span>
              <input className="input" inputMode="numeric" value={meal.carbs} onChange={(event) => updateMeal({ carbs: Number(event.target.value) || 0 })} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Gorduras</span>
              <input className="input" inputMode="numeric" value={meal.fat} onChange={(event) => updateMeal({ fat: Number(event.target.value) || 0 })} />
            </label>
          </div>
        </div>
      ) : (
        <>
          {renderPortionList(meal.items, primaryPortionKey, 'rose')}
          {editingPortions && meal.items.length > 0 && onPortionsChange ? (
            <PortionEditor items={meal.items} portionKey={primaryPortionKey} overrides={primaryOverrides} onChange={onPortionsChange} />
          ) : null}
          {primaryIsCustomized && editingPortions && onPortionsChange ? (
            <button className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400" onClick={() => onPortionsChange(primaryPortionKey, [])} type="button">
              <RotateCcw size={14} aria-hidden="true" /> Restaurar porções sugeridas
            </button>
          ) : null}

          {meal.options?.length ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Opções e substituições</p>
              {meal.options.map((option) => {
                const optionPortionKey = getMealPortionKey(meal.id, option.id);
                const optionIsCustomized = hasPortionChanges(option.items, portionOverrides?.[optionPortionKey]);
                return (
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3" key={option.id}>
                    <p className="text-sm font-extrabold text-slate-100">{option.title}</p>
                    {renderPortionList(option.items, optionPortionKey, 'teal')}
                    {editingPortions && onPortionsChange ? (
                      <PortionEditor
                        items={option.items}
                        portionKey={optionPortionKey}
                        overrides={portionOverrides?.[optionPortionKey]}
                        onChange={onPortionsChange}
                      />
                    ) : null}
                    {optionIsCustomized && editingPortions && onPortionsChange ? (
                      <button className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400" onClick={() => onPortionsChange(optionPortionKey, [])} type="button">
                        <RotateCcw size={14} aria-hidden="true" /> Restaurar porções sugeridas
                      </button>
                    ) : null}
                    {option.note ? <p className="mt-2 text-xs leading-relaxed text-slate-500">{option.note}</p> : null}
                  </div>
                );
              })}
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
      {onPortionsChange ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <PencilLine size={13} aria-hidden="true" /> Toque no ícone de ajustes para editar quantidade e unidade.
        </p>
      ) : null}
    </Card>
  );
}
