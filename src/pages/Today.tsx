import { Activity, ArrowRight, Check, Droplets, Dumbbell, Footprints, HeartPulse, MoonStar, Utensils } from 'lucide-react';
import { Card } from '../components/Card';
import { RankCard } from '../components/RankCard';
import { getWorkoutById } from '../data/workoutPlan';
import type { AppData, AppTab, DailyChecks, WeekPlanItem } from '../types';
import { getActiveMealDay, getRequiredMeals } from '../utils/meals';
import { getWorkoutSessionId, getWorkoutSessionProgress } from '../utils/workoutSessions';

type TodayProps = {
  data: AppData;
  dateKey: string;
  todayChecks: DailyChecks;
  todayPlan: WeekPlanItem;
  onSelectTab: (tab: AppTab) => void;
  onStartWorkout: (workoutId: string) => void;
  onToggleCheck: (key: keyof Omit<DailyChecks, 'meals'>) => void;
};

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function CheckAction({
  checked,
  icon: Icon,
  label,
  helper,
  onClick,
}: {
  checked: boolean;
  icon: typeof Droplets;
  label: string;
  helper: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-[1.15rem] border p-3 text-left transition ${
        checked ? 'border-lime-300/25 bg-lime-300/[0.08]' : 'border-white/10 bg-white/[0.035]'
      }`}
      type="button"
      onClick={onClick}
      aria-pressed={checked}
    >
      <span className="flex items-start justify-between gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${checked ? 'bg-lime-300 text-slate-950' : 'bg-white/[0.05] text-slate-300'}`}>
          {checked ? <Check size={18} aria-hidden="true" /> : <Icon size={18} aria-hidden="true" />}
        </span>
        <span className={`mt-1 h-2 w-2 rounded-full ${checked ? 'bg-lime-300' : 'bg-slate-700'}`} aria-hidden="true" />
      </span>
      <span className="mt-3 block text-sm font-extrabold text-slate-100">{label}</span>
      <span className="mt-1 block text-xs font-semibold text-slate-500">{checked ? 'Concluído hoje' : helper}</span>
    </button>
  );
}

export function Today({ data, dateKey, todayChecks, todayPlan, onSelectTab, onStartWorkout, onToggleCheck }: TodayProps) {
  const now = new Date();
  const todayWorkout = getWorkoutById(todayPlan.workoutId, data.workouts);
  const session = todayWorkout ? data.workoutSessions[getWorkoutSessionId(todayWorkout.id, dateKey)] : undefined;
  const sessionProgress = session ? getWorkoutSessionProgress(session) : null;
  const activeMealDay = getActiveMealDay(todayPlan.activityType);
  const requiredMeals = getRequiredMeals(data.meals, activeMealDay);
  const mealsCompleted = requiredMeals.filter((meal) => todayChecks.meals[meal.id]).length;
  const nextMeal = requiredMeals.find((meal) => !todayChecks.meals[meal.id]);
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const isCardioDay = todayPlan.activityType === 'cardio';
  const isRestDay = todayPlan.activityType === 'rest';

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4 pt-1">
        <div>
          <p className="eyebrow">{dateLabel}</p>
          <h1 className="page-title mt-2">{getGreeting()}, {data.profile.name}</h1>
          <p className="mt-2 text-sm text-slate-400">Seu plano de hoje, sem distração.</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-lime-300/15 bg-lime-300/[0.08] text-lime-200" aria-hidden="true">
          <Activity size={21} />
        </span>
      </header>

      <RankCard rank={data.rank} onClick={() => onSelectTab('progress')} />

      <Card className="overflow-hidden border-rose-300/15 bg-gradient-to-br from-rose-400/[0.11] via-slate-900 to-slate-950 p-0" dataTour="today-plan">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">{todayWorkout ? 'Treino principal' : isCardioDay ? 'Cardio programado' : 'Dia de recuperação'}</p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-white">{todayPlan.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {todayWorkout?.focus ?? todayPlan.cardio ?? todayPlan.rest ?? 'Recupere bem para a próxima sessão.'}
              </p>
            </div>
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-slate-950 ${
              todayWorkout ? 'bg-rose-300' : isCardioDay ? 'bg-teal-300' : 'bg-violet-300'
            }`}>
              {todayWorkout ? <Dumbbell size={23} aria-hidden="true" /> : isCardioDay ? <HeartPulse size={22} aria-hidden="true" /> : <MoonStar size={22} aria-hidden="true" />}
            </span>
          </div>

          {sessionProgress ? (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>{sessionProgress.completedSetCount}/{sessionProgress.plannedSetCount} séries</span>
                <span>{sessionProgress.percentage}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950/70" role="progressbar" aria-label="Progresso do treino de hoje" aria-valuemin={0} aria-valuemax={100} aria-valuenow={sessionProgress.percentage}>
                <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-300" style={{ width: `${sessionProgress.percentage}%` }} />
              </div>
            </div>
          ) : null}
        </div>

        <button
          className="flex w-full items-center justify-between border-t border-white/10 bg-white/[0.025] px-5 py-4 text-left font-extrabold text-white"
          type="button"
          onClick={() => {
            if (todayWorkout && !session) {
              onStartWorkout(todayWorkout.id);
            }
            onSelectTab(todayWorkout ? 'workout' : isCardioDay ? 'workout' : 'progress');
          }}
        >
          <span>{session?.completedAt ? 'Rever sessão' : session ? 'Continuar treino' : todayWorkout ? 'Começar treino' : isRestDay ? 'Ver progresso' : 'Ver cardio'}</span>
          <ArrowRight size={19} aria-hidden="true" />
        </button>
      </Card>

      <section aria-labelledby="daily-actions-title">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="eyebrow">Consistência</p>
            <h2 className="section-title mt-1" id="daily-actions-title">Metas rápidas</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">vale XP uma vez ao dia</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <CheckAction
            checked={todayChecks.waterDone}
            icon={Droplets}
            label="Água"
            helper={`${data.goals.waterLiters} L · +10 XP`}
            onClick={() => onToggleCheck('waterDone')}
          />
          <CheckAction
            checked={todayChecks.stepsDone}
            icon={Footprints}
            label="Passos"
            helper="Meta pessoal · +10 XP"
            onClick={() => onToggleCheck('stepsDone')}
          />
          {isCardioDay && todayPlan.cardio ? (
            <CheckAction
              checked={todayChecks.cardioDone}
              icon={HeartPulse}
              label="Cardio"
              helper="Programado · +35 XP"
              onClick={() => onToggleCheck('cardioDone')}
            />
          ) : null}
          <button
            className="rounded-[1.15rem] border border-white/10 bg-white/[0.035] p-3 text-left"
            type="button"
            onClick={() => onSelectTab('diet')}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-300/10 text-teal-200">
              <Utensils size={18} aria-hidden="true" />
            </span>
            <span className="mt-3 block text-sm font-extrabold text-slate-100">Refeições</span>
            <span className="mt-1 block text-xs font-semibold text-slate-500">{mealsCompleted}/{requiredMeals.length} essenciais</span>
          </button>
        </div>
      </section>

      {nextMeal ? (
        <button
          className="flex w-full items-center gap-3 rounded-[1.35rem] border border-white/10 bg-slate-900/65 p-4 text-left"
          type="button"
          onClick={() => onSelectTab('diet')}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-300/10 text-teal-200">
            <Utensils size={19} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="eyebrow">Próxima refeição · {nextMeal.time}</span>
            <span className="mt-1 block truncate text-sm font-extrabold text-slate-100">{nextMeal.title}</span>
          </span>
          <ArrowRight className="shrink-0 text-slate-500" size={18} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
