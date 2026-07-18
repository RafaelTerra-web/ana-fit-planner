import { CalendarRange, ChevronDown, Dumbbell, HeartPulse, MoonStar } from 'lucide-react';
import { useState } from 'react';
import type { WeekActivityType, WeekPlanItem, Workout } from '../types';
import { Card } from './Card';

type WeekPlanEditorProps = {
  weekPlan: WeekPlanItem[];
  workouts: Workout[];
  onChange: (weekPlan: WeekPlanItem[]) => void;
};

type WeekDayEditorProps = {
  item: WeekPlanItem;
  workouts: Workout[];
  onActivityChange: (item: WeekPlanItem, activityType: WeekActivityType) => void;
  onDayChange: (dayIndex: number, changes: Partial<WeekPlanItem>) => void;
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

function WeekDayEditor({ item, workouts, onActivityChange, onDayChange }: WeekDayEditorProps) {
  const meta = activityMeta[item.activityType];
  const activeOption = activityOptions.find((option) => option.value === item.activityType) ?? activityOptions[2];
  const ActiveIcon = activeOption.icon;

  return (
    <section className="rounded-[1.15rem] border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-300">{item.dayLabel}</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{item.title}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[0.62rem] font-black uppercase tracking-wide ${meta.badge}`}>
          <ActiveIcon size={12} aria-hidden="true" /> {meta.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-slate-950/45 p-1" role="group" aria-label={`Atividade de ${item.dayLabel}`}>
        {activityOptions.map(({ value, label, icon: Icon }) => {
          const isActive = item.activityType === value;
          return (
            <button
              aria-pressed={isActive}
              className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.65rem] font-extrabold transition ${
                isActive ? `${activityMeta[value].activeButton} shadow-sm` : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
              }`}
              key={value}
              onClick={() => onActivityChange(item, value)}
              type="button"
            >
              <Icon size={15} aria-hidden="true" /> {label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2">
        {item.activityType === 'workout' ? (
          <label className="grid gap-1 text-xs font-bold text-slate-400">
            <span>Treino do dia</span>
            <select
              className="input"
              value={item.workoutId ?? ''}
              onChange={(event) => {
                const workout = workouts.find((candidate) => candidate.id === event.target.value);
                if (workout) {
                  onDayChange(item.dayIndex, { workoutId: workout.id, title: workout.title });
                }
              }}
            >
              {workouts.map((workout) => (
                <option key={workout.id} value={workout.id}>
                  {workout.shortTitle}
                </option>
              ))}
            </select>
          </label>
        ) : item.activityType === 'cardio' ? (
          <label className="grid gap-1 text-xs font-bold text-slate-400">
            <span>Duração e intensidade</span>
            <input
              className="input"
              placeholder="Ex.: 30 min leve"
              value={item.cardio ?? ''}
              onChange={(event) => onDayChange(item.dayIndex, { cardio: event.target.value || undefined })}
            />
          </label>
        ) : (
          <label className="grid gap-1 text-xs font-bold text-slate-400">
            <span>Orientação de recuperação</span>
            <input
              className="input"
              placeholder="Ex.: caminhada leve e mobilidade"
              value={item.rest ?? ''}
              onChange={(event) => onDayChange(item.dayIndex, { rest: event.target.value || undefined })}
            />
          </label>
        )}

        <label className="grid gap-1 text-xs font-bold text-slate-400">
          <span>Nome no calendário</span>
          <input
            className="input"
            value={item.title}
            onChange={(event) => onDayChange(item.dayIndex, { title: event.target.value })}
          />
        </label>
      </div>
    </section>
  );
}

export function WeekPlanEditor({ weekPlan, workouts, onChange }: WeekPlanEditorProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(1);
  const primaryDays = weekPlan
    .filter((item) => item.dayIndex >= 1 && item.dayIndex <= 6)
    .sort((first, second) => first.dayIndex - second.dayIndex);
  const selectedDay = primaryDays.find((item) => item.dayIndex === selectedDayIndex) ?? primaryDays[0];
  const sunday = weekPlan.find((item) => item.dayIndex === 0);
  const workoutDays = weekPlan.filter((item) => item.activityType === 'workout').length;
  const cardioDays = weekPlan.filter((item) => item.activityType === 'cardio').length;

  const updateDay = (dayIndex: number, changes: Partial<WeekPlanItem>) => {
    onChange(weekPlan.map((item) => (item.dayIndex === dayIndex ? { ...item, ...changes } : item)));
  };

  const updateActivity = (item: WeekPlanItem, activityType: WeekActivityType) => {
    if (activityType === 'workout') {
      const workout = workouts.find((candidate) => candidate.id === item.workoutId) ?? workouts[0];
      if (!workout) {
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
        title: item.activityType === 'cardio' ? item.title : 'Cardio leve',
        workoutId: undefined,
        cardio: item.cardio || '25 a 40 min leve',
        rest: undefined,
      });
      return;
    }

    updateDay(item.dayIndex, {
      activityType,
      title: item.activityType === 'rest' ? item.title : 'Descanso e recuperação',
      workoutId: undefined,
      cardio: undefined,
      rest: item.rest || 'Recuperação e rotina leve.',
    });
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-200">
          <CalendarRange size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="section-title">Rotina e split</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            Defina treino, cardio ou descanso de segunda a sábado.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2" aria-label="Resumo da rotina semanal">
        <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.06] px-3 py-2.5">
          <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-500">Musculação</p>
          <p className="mt-1 text-sm font-extrabold text-lime-100">{workoutDays} dias</p>
        </div>
        <div className="rounded-2xl border border-teal-300/15 bg-teal-300/[0.06] px-3 py-2.5">
          <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-500">Cardio</p>
          <p className="mt-1 text-sm font-extrabold text-teal-100">{cardioDays} dias</p>
        </div>
      </div>

      <h3 className="mt-5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Segunda a sábado</h3>
      <div className="mt-3 grid grid-cols-3 gap-2" role="tablist" aria-label="Escolher dia da rotina">
        {primaryDays.map((item) => {
          const isSelected = selectedDay?.dayIndex === item.dayIndex;
          const option = activityOptions.find((candidate) => candidate.value === item.activityType) ?? activityOptions[2];
          const Icon = option.icon;
          return (
            <button
              aria-selected={isSelected}
              className={`min-h-16 rounded-2xl border px-2 py-2 text-left transition ${
                isSelected
                  ? 'border-lime-300/30 bg-lime-300/10 text-lime-100'
                  : 'border-white/10 bg-white/[0.025] text-slate-400'
              }`}
              key={item.dayIndex}
              onClick={() => setSelectedDayIndex(item.dayIndex)}
              role="tab"
              type="button"
            >
              <span className="block truncate text-[0.65rem] font-black uppercase tracking-wider">{item.dayLabel}</span>
              <span className="mt-1 flex items-center gap-1 text-[0.62rem] font-bold text-slate-500">
                <Icon size={12} aria-hidden="true" /> {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDay ? (
        <div className="mt-3" role="tabpanel">
          <WeekDayEditor
            item={selectedDay}
            workouts={workouts}
            onActivityChange={updateActivity}
            onDayChange={updateDay}
          />
        </div>
      ) : null}

      {sunday ? (
        <details className="manage-plan mt-3 overflow-hidden rounded-[1.15rem] border border-white/10 bg-white/[0.025]">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-3 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black uppercase tracking-[0.12em] text-slate-300">Domingo opcional</span>
              <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{sunday.title}</span>
            </span>
            <ChevronDown className="manage-chevron shrink-0 text-slate-500 transition" size={18} aria-hidden="true" />
          </summary>
          <div className="border-t border-white/10 p-2">
            <WeekDayEditor item={sunday} workouts={workouts} onActivityChange={updateActivity} onDayChange={updateDay} />
          </div>
        </details>
      ) : null}

      <p className="mt-4 text-xs font-semibold leading-relaxed text-slate-500">
        As frequências do perfil, metas e dieta são recalculadas quando a quantidade de treinos ou cardios muda.
      </p>
    </Card>
  );
}
