import { CalendarRange, ChevronDown, Dumbbell, HeartPulse, MoonStar, Plus } from 'lucide-react';
import { useState } from 'react';
import type { WeekActivityType, WeekPlanItem, Workout } from '../types';
import { Card } from './Card';

type WeekPlanEditorProps = {
  onChange: (weekPlan: WeekPlanItem[]) => void;
  onCreateWorkoutForDay: (dayIndex: number) => void;
  weekPlan: WeekPlanItem[];
  workouts: Workout[];
};

const activityOptions: Array<{
  value: WeekActivityType;
  label: string;
  icon: typeof Dumbbell;
}> = [
  { value: 'workout', label: 'Treino', icon: Dumbbell },
  { value: 'cardio', label: 'Cardio', icon: HeartPulse },
  { value: 'rest', label: 'Descanso', icon: MoonStar },
];

const activityMeta: Record<WeekActivityType, { label: string; badge: string; activeButton: string }> = {
  workout: { label: 'Treino', badge: 'bg-lime-300/10 text-lime-200', activeButton: 'bg-lime-300 text-slate-950' },
  cardio: { label: 'Cardio', badge: 'bg-teal-300/10 text-teal-200', activeButton: 'bg-teal-300 text-slate-950' },
  rest: { label: 'Descanso', badge: 'bg-violet-300/10 text-violet-200', activeButton: 'bg-violet-300 text-slate-950' },
};

export function WeekPlanEditor({ onChange, onCreateWorkoutForDay, weekPlan, workouts }: WeekPlanEditorProps) {
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | undefined>(1);
  const orderedDays = [...weekPlan].sort((first, second) => {
    const firstOrder = first.dayIndex === 0 ? 7 : first.dayIndex;
    const secondOrder = second.dayIndex === 0 ? 7 : second.dayIndex;
    return firstOrder - secondOrder;
  });
  const workoutDays = weekPlan.filter((item) => item.activityType === 'workout').length;
  const cardioDays = weekPlan.filter((item) => item.activityType === 'cardio').length;
  const restDays = weekPlan.filter((item) => item.activityType === 'rest').length;

  const updateDay = (dayIndex: number, changes: Partial<WeekPlanItem>) => {
    onChange(weekPlan.map((item) => (item.dayIndex === dayIndex ? { ...item, ...changes } : item)));
  };

  const updateActivity = (item: WeekPlanItem, activityType: WeekActivityType) => {
    if (activityType === 'workout') {
      const workout = workouts.find((candidate) => candidate.id === item.workoutId) ?? workouts[0];
      if (!workout) {
        onCreateWorkoutForDay(item.dayIndex);
        return;
      }

      updateDay(item.dayIndex, {
        activityType,
        title: workout.title,
        workoutId: workout.id,
        cardio: undefined,
        rest: undefined,
      });
      return;
    }

    if (activityType === 'cardio') {
      updateDay(item.dayIndex, {
        activityType,
        title: 'Cardio',
        workoutId: undefined,
        cardio: item.cardio || '25 a 40 min leve',
        rest: undefined,
      });
      return;
    }

    updateDay(item.dayIndex, {
      activityType: 'rest',
      title: 'Descanso e recuperação',
      workoutId: undefined,
      cardio: undefined,
      rest: item.rest || 'Recuperação e rotina leve.',
    });
  };

  const getDaySummary = (item: WeekPlanItem) => {
    if (item.activityType === 'workout') {
      return workouts.find((workout) => workout.id === item.workoutId)?.title ?? 'Escolha um treino';
    }
    return item.activityType === 'cardio' ? item.cardio || 'Defina o cardio' : item.rest || 'Recuperação';
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3" data-tour="settings-week">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-300/10 text-teal-200">
          <CalendarRange size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-teal-300">2 · Organize</p>
          <h2 className="section-title mt-1">Agenda semanal</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">Toque em qualquer dia para escolher treino, cardio ou descanso.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Resumo da rotina semanal">
        <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.06] px-2 py-2.5 text-center">
          <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-500">Treino</p>
          <p className="mt-1 text-sm font-extrabold text-lime-100">{workoutDays}</p>
        </div>
        <div className="rounded-2xl border border-teal-300/15 bg-teal-300/[0.06] px-2 py-2.5 text-center">
          <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-500">Cardio</p>
          <p className="mt-1 text-sm font-extrabold text-teal-100">{cardioDays}</p>
        </div>
        <div className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.06] px-2 py-2.5 text-center">
          <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-500">Descanso</p>
          <p className="mt-1 text-sm font-extrabold text-violet-100">{restDays}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {orderedDays.map((item) => {
          const isExpanded = expandedDayIndex === item.dayIndex;
          const meta = activityMeta[item.activityType];
          const activeOption = activityOptions.find((option) => option.value === item.activityType) ?? activityOptions[2];
          const ActiveIcon = activeOption.icon;

          return (
            <section className={`overflow-hidden rounded-[1.15rem] border transition ${isExpanded ? 'border-lime-300/25 bg-lime-300/[0.045]' : 'border-white/10 bg-white/[0.025]'}`} key={item.dayIndex}>
              <button
                aria-expanded={isExpanded}
                className="flex w-full items-center gap-3 p-3 text-left"
                onClick={() => setExpandedDayIndex(isExpanded ? undefined : item.dayIndex)}
                type="button"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.badge}`}>
                  <ActiveIcon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black uppercase tracking-[0.12em] text-slate-300">{item.dayLabel}</span>
                  <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{getDaySummary(item)}</span>
                </span>
                <span className={`hidden shrink-0 rounded-full px-2 py-1 text-[0.6rem] font-black uppercase tracking-wide sm:inline-flex ${meta.badge}`}>{meta.label}</span>
                <ChevronDown className={`shrink-0 text-slate-500 transition ${isExpanded ? 'rotate-180' : ''}`} size={18} aria-hidden="true" />
              </button>

              {isExpanded ? (
                <div className="border-t border-white/10 p-3">
                  <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-slate-950/45 p-1" role="group" aria-label={`Atividade de ${item.dayLabel}`}>
                    {activityOptions.map(({ value, label, icon: Icon }) => {
                      const isActive = item.activityType === value;
                      return (
                        <button
                          aria-pressed={isActive}
                          className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.64rem] font-extrabold transition ${isActive ? `${activityMeta[value].activeButton} shadow-sm` : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'}`}
                          key={value}
                          onClick={() => updateActivity(item, value)}
                          type="button"
                        >
                          <Icon size={15} aria-hidden="true" /> {label}
                        </button>
                      );
                    })}
                  </div>

                  {item.activityType === 'workout' ? (
                    <div className="mt-3 grid gap-2">
                      <label className="grid gap-1 text-xs font-bold text-slate-400">
                        <span>Treino deste dia</span>
                        <select
                          className="input"
                          onChange={(event) => {
                            const workout = workouts.find((candidate) => candidate.id === event.target.value);
                            if (workout) updateDay(item.dayIndex, { workoutId: workout.id, title: workout.title });
                          }}
                          value={item.workoutId ?? ''}
                        >
                          {workouts.map((workout) => <option key={workout.id} value={workout.id}>{workout.title}</option>)}
                        </select>
                      </label>
                      <button className="secondary-button min-h-11 w-full text-sm" onClick={() => onCreateWorkoutForDay(item.dayIndex)} type="button">
                        <Plus size={17} aria-hidden="true" /> Criar treino para {item.dayLabel.toLowerCase()}
                      </button>
                    </div>
                  ) : item.activityType === 'cardio' ? (
                    <label className="mt-3 grid gap-1 text-xs font-bold text-slate-400">
                      <span>Duração e intensidade</span>
                      <input
                        className="input"
                        onChange={(event) => onChange(weekPlan.map((day) => day.dayIndex === item.dayIndex ? { ...day, cardio: event.target.value || undefined } : day))}
                        placeholder="Ex.: 30 min leve"
                        value={item.cardio ?? ''}
                      />
                    </label>
                  ) : (
                    <label className="mt-3 grid gap-1 text-xs font-bold text-slate-400">
                      <span>Orientação de recuperação</span>
                      <input
                        className="input"
                        onChange={(event) => onChange(weekPlan.map((day) => day.dayIndex === item.dayIndex ? { ...day, rest: event.target.value || undefined } : day))}
                        placeholder="Ex.: caminhada leve e mobilidade"
                        value={item.rest ?? ''}
                      />
                    </label>
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <p className="mt-4 text-xs font-semibold leading-relaxed text-slate-500">
        A frequência do perfil e as sugestões do plano se ajustam automaticamente à agenda.
      </p>
    </Card>
  );
}
