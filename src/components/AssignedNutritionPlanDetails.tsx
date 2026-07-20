import { AlertTriangle, ChevronDown, Info, RefreshCw } from 'lucide-react';
import type { AssignedNutritionPlan } from '../types';
import { Card } from './Card';

type AssignedNutritionPlanDetailsProps = {
  plan: AssignedNutritionPlan;
};

function rangeLabel(range: { min: number; max: number }, suffix: string) {
  return range.min === range.max ? `${range.min} ${suffix}` : `${range.min}–${range.max} ${suffix}`;
}

function BulletList({ items, tone = 'teal' }: { items: string[]; tone?: 'teal' | 'rose' | 'amber' }) {
  const dotColor = tone === 'rose' ? 'bg-rose-300' : tone === 'amber' ? 'bg-amber-300' : 'bg-teal-300';

  return (
    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-400">
      {items.map((item) => (
        <li className="flex gap-2" key={item}>
          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function AssignedNutritionPlanDetails({ plan }: AssignedNutritionPlanDetailsProps) {
  const targetCards = [
    plan.targets?.trainingDayCalories ? { label: 'Treino', value: rangeLabel(plan.targets.trainingDayCalories, 'kcal') } : null,
    plan.targets?.restDayCalories ? { label: 'Descanso', value: rangeLabel(plan.targets.restDayCalories, 'kcal') } : null,
    plan.targets?.proteinGrams ? { label: 'Proteína', value: rangeLabel(plan.targets.proteinGrams, 'g') } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const contextItems = [
    plan.context.sex === 'female' ? 'Mulher' : plan.context.sex === 'male' ? 'Homem' : plan.context.sex === 'other' ? 'Outro' : null,
    plan.context.ageYears ? `${plan.context.ageYears} anos` : null,
    plan.context.heightCm ? `${plan.context.heightCm} cm` : null,
    plan.context.weightKg ? `${plan.context.weightKg} kg` : null,
    plan.context.trainingDaysPerWeek ? `${plan.context.trainingDaysPerWeek} treinos/semana` : null,
    plan.context.cardioDaysPerWeek ? `${plan.context.cardioDaysPerWeek} cardios/semana` : null,
    plan.context.restDaysPerWeek ? `${plan.context.restDaysPerWeek} descansos/semana` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <Card className="border-lime-300/20 bg-gradient-to-br from-lime-300/[0.08] via-slate-900 to-slate-950">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 shrink-0 text-lime-300" size={20} aria-hidden="true" />
        <div>
          <p className="eyebrow">Plano individual · {plan.mealStrategy === 'flexible' ? 'Porções flexíveis' : 'Metas definidas'}</p>
          <h2 className="mt-1 text-lg font-black text-slate-50">{plan.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{plan.objective}</p>
        </div>
      </div>

      {targetCards.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
          {targetCards.map((target) => (
            <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-3" key={target.label}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{target.label}</p>
              <p className="mt-1 text-sm font-black text-slate-50">{target.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {contextItems.length > 0 || plan.context.avoidedFoods?.length || plan.context.notes?.length ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Contexto do plano</p>
          {contextItems.length > 0 ? <p className="mt-2 text-sm leading-relaxed text-slate-300">{contextItems.join(' · ')}</p> : null}
          {plan.context.avoidedFoods?.length ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-400">Evita: {plan.context.avoidedFoods.join(', ')}.</p>
          ) : null}
          {plan.context.notes?.map((note) => <p className="mt-2 text-xs leading-relaxed text-slate-400" key={note}>{note}</p>)}
        </div>
      ) : null}

      {plan.mealWeightBasis || plan.portionGuidance?.length ? (
        <div className="mt-4 rounded-xl border border-teal-300/15 bg-teal-300/[0.05] p-3">
          <p className="text-xs font-black uppercase tracking-wide text-teal-200">Como medir as porções</p>
          {plan.mealWeightBasis ? <p className="mt-2 text-xs leading-relaxed text-slate-400">{plan.mealWeightBasis}</p> : null}
          {plan.portionGuidance?.length ? (
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-400">
              {plan.portionGuidance.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}

      {plan.macroEstimateNote ? <p className="mt-3 text-xs leading-relaxed text-slate-500">{plan.macroEstimateNote}</p> : null}

      {plan.disclaimer || plan.targets?.minimumCaloriesWithoutProfessional ? (
        <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] p-3">
          <p className="flex items-center gap-2 text-sm font-extrabold text-amber-200">
            <AlertTriangle size={17} aria-hidden="true" /> Atenção profissional
          </p>
          {plan.targets?.minimumCaloriesWithoutProfessional ? (
            <p className="mt-2 text-xs font-bold leading-relaxed text-amber-100">
              Não reduzir abaixo de {plan.targets.minimumCaloriesWithoutProfessional} kcal sem acompanhamento.
            </p>
          ) : null}
          {plan.disclaimer ? <p className="mt-2 text-xs leading-relaxed text-amber-100/75">{plan.disclaimer}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}

export function AssignedNutritionPlanGuidance({ plan }: AssignedNutritionPlanDetailsProps) {
  const restAdjustments = plan.restDayAdjustments ?? [];
  const substitutions = plan.substitutions ?? [];
  const guidance = plan.guidance ?? [];
  const hasAdaptations = restAdjustments.length > 0 || substitutions.length > 0;

  return (
    <>
      {hasAdaptations ? <Card>
        <div className="flex items-center gap-2">
          <RefreshCw className="text-teal-300" size={20} aria-hidden="true" />
          <h2 className="section-title">Como adaptar</h2>
        </div>
        <div className="mt-4 space-y-3">
          {restAdjustments.length > 0 ? <details className="group rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-slate-100">
              <span>Dia de descanso</span>
              <ChevronDown className="shrink-0 transition group-open:rotate-180" size={17} aria-hidden="true" />
            </summary>
            <BulletList items={restAdjustments} />
          </details> : null}
          {substitutions.map((section) => (
            <details className="group rounded-xl border border-white/10 bg-white/[0.03] p-3" key={section.id}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-slate-100">
                <span>Substituições · {section.title}</span>
                <ChevronDown className="shrink-0 transition group-open:rotate-180" size={17} aria-hidden="true" />
              </summary>
              <BulletList items={section.items} tone="rose" />
            </details>
          ))}
        </div>
      </Card> : null}

      {guidance.length > 0 ? <Card>
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-amber-300" size={20} aria-hidden="true" />
          <h2 className="section-title">Saúde e acompanhamento</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Consulte micronutrientes, sono, acompanhamento e sinais de alerta quando precisar.
        </p>
        <div className="mt-4 space-y-3">
          {guidance.map((section) => (
            <details className="group rounded-xl border border-white/10 bg-white/[0.03] p-3" key={section.id}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-slate-100">
                <span>{section.title}</span>
                <ChevronDown className="shrink-0 transition group-open:rotate-180" size={17} aria-hidden="true" />
              </summary>
              <BulletList items={section.items} tone="amber" />
            </details>
          ))}
        </div>
      </Card> : null}
    </>
  );
}
