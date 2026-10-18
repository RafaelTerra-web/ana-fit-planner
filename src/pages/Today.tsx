import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Droplets,
  Dumbbell,
  Footprints,
  HeartPulse,
  MoonStar,
  Plus,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { RankCard } from '../components/RankCard';
import { getWorkoutById } from '../data/workoutPlan';
import type { AppData, AppTab, DailyChecks, WeekPlanItem } from '../types';
import { getActiveMealDay, getRequiredMeals } from '../utils/meals';
import { getLocalDateKey, getWorkoutSessionId, getWorkoutSessionProgress } from '../utils/workoutSessions';
import { estimateWorkoutMinutes } from '../utils/workoutExperience';
import { getSessionTrainingSummary } from '../utils/trainingInsights';

type TodayProps = {
  data: AppData;
  dateKey: string;
  todayChecks: DailyChecks;
  todayPlan: WeekPlanItem;
  onSelectTab: (tab: AppTab) => void;
  onStartWorkout: (workoutId: string) => void;
  onToggleCheck: (key: keyof Omit<DailyChecks, 'meals'>) => void;
  onManagePlan?: () => void;
  onOpenWorkout?: (workoutId: string) => void;
};
const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function Today({
  data,
  dateKey,
  todayChecks,
  todayPlan,
  onSelectTab,
  onStartWorkout,
  onToggleCheck,
  onManagePlan,
  onOpenWorkout,
}: TodayProps) {
  const now = new Date(`${dateKey}T12:00:00`);
  const [selectedDay, setSelectedDay] = useState(now.getDay());
  useEffect(() => setSelectedDay(new Date(`${dateKey}T12:00:00`).getDay()), [dateKey]);
  const monday = new Date(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = getLocalDateKey(monday);
  const selectedPlan = data.weekPlan.find((item) => item.dayIndex === selectedDay) ?? todayPlan;
  const workout = getWorkoutById(selectedPlan.workoutId, data.workouts);
  const selectedSession = workout ? data.workoutSessions[getWorkoutSessionId(workout.id, dateKey)] : undefined;
  const active = data.activeWorkoutSessionId ? data.workoutSessions[data.activeWorkoutSessionId] : undefined;
  const activeWorkout = active && !active.completedAt ? getWorkoutById(active.workoutId, data.workouts) : undefined;
  const sessionProgress = selectedSession ? getWorkoutSessionProgress(selectedSession) : null;
  const weekSessions = Object.values(data.workoutSessions).filter(
    (session) => session.completedAt && session.dateKey >= weekStart && session.dateKey <= dateKey,
  );
  const weekDays = new Set(weekSessions.map((session) => session.dateKey)).size;
  const weekVolume = weekSessions.reduce((total, session) => total + getSessionTrainingSummary(session).volumeKg, 0);
  const requiredMeals = getRequiredMeals(data.meals, getActiveMealDay(todayPlan.activityType));
  const mealsDone = requiredMeals.filter((meal) => todayChecks.meals[meal.id]).length;
  const nextMeal = requiredMeals.find((meal) => !todayChecks.meals[meal.id]);
  const plannedDays = data.weekPlan.filter((item) => item.activityType === 'workout').length;
  const startSelected = () => {
    if (workout) onStartWorkout(workout.id);
    onSelectTab('workout');
  };
  const hour = new Date().getHours();

  return (
    <div className="home-page">
      <header className="home-heading">
        <div>
          <p className="home-date">
            {now.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <h1>
            {hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'}, {data.profile.name.split(' ')[0]}
            <span> ✦</span>
          </h1>
          <p>Encontre seu ritmo. A evolução vem com você.</p>
        </div>
        <span className="home-heading-tag">
          <span />
          Tudo pronto para hoje
        </span>
      </header>
      <div className="home-stats">
        <button type="button" onClick={() => onSelectTab('progress')}>
          <span className="home-stat-icon mint">
            <Dumbbell size={19} />
          </span>
          <span>
            <small>Treinos nesta semana</small>
            <strong>
              {weekSessions.length}
              <em> / {plannedDays} planejados</em>
            </strong>
          </span>
          <ArrowRight size={17} />
        </button>
        <button type="button" onClick={() => onSelectTab('progress')}>
          <span className="home-stat-icon peach">
            <CalendarDays size={19} />
          </span>
          <span>
            <small>Dias em movimento</small>
            <strong>
              {weekDays}
              <em>{weekDays === 1 ? ' dia de musculação' : ' dias de musculação'}</em>
            </strong>
          </span>
          <ArrowRight size={17} />
        </button>
        <button type="button" onClick={() => onSelectTab('progress')}>
          <span className="home-stat-icon lavender">
            <Sparkles size={19} />
          </span>
          <span>
            <small>Volume da semana</small>
            <strong>
              {number.format(weekVolume)}
              <em> kg registrados</em>
            </strong>
          </span>
          <ArrowRight size={17} />
        </button>
      </div>
      {activeWorkout && active && (
        <button className="home-resume" type="button" onClick={() => onSelectTab('workout')}>
          <span className="home-pulse" />
          <span>
            Seu treino está em andamento<strong>{activeWorkout.title}</strong>
          </span>
          <span className="home-resume-action">
            Continuar <ArrowRight size={18} />
          </span>
        </button>
      )}
      <div className="home-columns">
        <div className="home-main-column">
          <section className="home-week" aria-labelledby="home-week-title">
            <div className="home-section-heading">
              <h2 id="home-week-title">Sua semana</h2>
              <span>
                {monday.toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                —{' '}
                {sunday.toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
            <div className="home-week-days">
              {Array.from({ length: 7 }, (_, index) => {
                const date = new Date(monday);
                date.setDate(monday.getDate() + index);
                const key = getLocalDateKey(date);
                const plan = data.weekPlan.find((item) => item.dayIndex === date.getDay());
                const completed = weekSessions.some((session) => session.dateKey === key);
                return (
                  <button
                    type="button"
                    key={key}
                    className={`home-week-day ${selectedDay === date.getDay() ? 'is-selected' : ''} ${key === dateKey ? 'is-today' : ''}`}
                    aria-pressed={selectedDay === date.getDay()}
                    aria-current={key === dateKey ? 'date' : undefined}
                    aria-label={`${date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}, ${plan?.title ?? 'Descanso'}${completed ? ', treino concluído' : ''}`}
                    onClick={() => setSelectedDay(date.getDay())}
                  >
                    <span>{days[date.getDay()]}</span>
                    <strong>{date.getDate()}</strong>
                    {completed ? <Check size={12} /> : <i className={plan?.activityType ?? 'rest'} />}
                  </button>
                );
              })}
            </div>
            <div className="home-week-caption">
              <span>
                <i /> Musculação
              </span>
              <span>
                <i /> Cardio
              </span>
              <span>
                <i /> Recuperação
              </span>
              {onManagePlan && (
                <button type="button" onClick={onManagePlan}>
                  Editar <ChevronRight size={13} />
                </button>
              )}
            </div>
          </section>
          <section
            className={`home-workout-card ${workout ? '' : 'is-recovery'}`}
            data-tour="today-plan"
            aria-labelledby="home-plan-title"
          >
            <div className="home-workout-label">
              <span>
                {selectedDay === now.getDay() ? 'SEU PLANO DE HOJE' : `${days[selectedDay]} · PLANO DA SEMANA`}
              </span>
              <span className="home-workout-symbol">
                {workout ? (
                  <Dumbbell size={28} />
                ) : selectedPlan.activityType === 'cardio' ? (
                  <HeartPulse size={28} />
                ) : (
                  <MoonStar size={28} />
                )}
              </span>
            </div>
            <h2 id="home-plan-title">{selectedPlan.title}</h2>
            <p>
              {workout?.focus ??
                selectedPlan.cardio ??
                selectedPlan.rest ??
                'Dê espaço para a recuperação. Seu próximo treino espera por você.'}
            </p>
            {workout ? (
              <div className="home-workout-meta">
                <span>
                  <Dumbbell size={15} />
                  {workout.exercises.length} exercícios
                </span>
                <span>
                  <Clock3 size={15} />~{estimateWorkoutMinutes(workout)} min
                </span>
                <span>
                  <CheckCircle2 size={15} />
                  {workout.exercises.reduce((total, exercise) => total + exercise.sets, 0)} séries
                </span>
              </div>
            ) : (
              <p className="home-recovery-note">Consistência também é respeitar o seu descanso.</p>
            )}
            {sessionProgress && (
              <div className="home-session-progress">
                <span>
                  {sessionProgress.completedSetCount}/{sessionProgress.plannedSetCount} séries hoje
                </span>
                <div>
                  <i style={{ width: `${sessionProgress.percentage}%` }} />
                </div>
              </div>
            )}
            <button
              className="home-primary"
              type="button"
              onClick={workout ? startSelected : () => onSelectTab('workout')}
            >
              {selectedSession?.completedAt
                ? 'Ver treino de hoje'
                : selectedSession
                  ? 'Continuar este treino'
                  : workout
                    ? selectedDay === now.getDay()
                      ? 'Vamos começar'
                      : 'Treinar este plano hoje'
                    : 'Explorar meus treinos'}
              <ArrowRight size={19} />
            </button>
            {selectedDay !== now.getDay() && workout && (
              <small className="home-plan-note">Ao iniciar, a sessão será registrada hoje.</small>
            )}
          </section>
          <section className="home-routines">
            <div className="home-section-heading">
              <h2>Seus treinos, do seu jeito</h2>
              <button className="text-button" type="button" onClick={() => onSelectTab('workout')}>
                Ver todos <ArrowRight size={15} />
              </button>
            </div>
            <div className="home-routine-previews">
              {data.workouts.slice(0, 2).map((routine, index) => (
                <button
                  key={routine.id}
                  type="button"
                  onClick={() => {
                    onOpenWorkout?.(routine.id);
                    onSelectTab('workout');
                  }}
                >
                  <span className={index ? 'lavender' : 'mint'}>
                    <Dumbbell size={21} />
                  </span>
                  <strong>{routine.shortTitle || routine.title}</strong>
                  <small>{routine.exercises.length} exercícios</small>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
            {onManagePlan && (
              <button className="home-create-routine" type="button" onClick={onManagePlan}>
                <Plus size={16} /> Personalizar minha rotina
              </button>
            )}
          </section>
        </div>
        <aside className="home-side-column">
          <section className="home-habits" aria-labelledby="home-habits-title">
            <div className="home-section-heading">
              <h2 id="home-habits-title">Pequenos cuidados</h2>
              <span>HOJE</span>
            </div>
            <p>O que acontece fora do treino também conta.</p>
            <div className="home-habit-list">
              <button type="button" onClick={() => onToggleCheck('waterDone')} aria-pressed={todayChecks.waterDone}>
                <span className="home-habit-icon water">
                  <Droplets size={21} />
                </span>
                <span>
                  <strong>Hidratação</strong>
                  <small>{data.goals.waterLiters} L de água · meta diária</small>
                </span>
                <span className={`home-habit-check ${todayChecks.waterDone ? 'is-checked' : ''}`}>
                  {todayChecks.waterDone && <Check size={15} />}
                </span>
              </button>
              <button type="button" onClick={() => onToggleCheck('stepsDone')} aria-pressed={todayChecks.stepsDone}>
                <span className="home-habit-icon steps">
                  <Footprints size={21} />
                </span>
                <span>
                  <strong>Movimente-se</strong>
                  <small>Sua meta pessoal de passos</small>
                </span>
                <span className={`home-habit-check ${todayChecks.stepsDone ? 'is-checked' : ''}`}>
                  {todayChecks.stepsDone && <Check size={15} />}
                </span>
              </button>
              {todayPlan.activityType === 'cardio' && (
                <button type="button" onClick={() => onToggleCheck('cardioDone')} aria-pressed={todayChecks.cardioDone}>
                  <span className="home-habit-icon cardio">
                    <HeartPulse size={21} />
                  </span>
                  <span>
                    <strong>Cardio programado</strong>
                    <small>{todayPlan.cardio}</small>
                  </span>
                  <span className={`home-habit-check ${todayChecks.cardioDone ? 'is-checked' : ''}`}>
                    {todayChecks.cardioDone && <Check size={15} />}
                  </span>
                </button>
              )}
              <button type="button" onClick={() => onSelectTab('diet')}>
                <span className="home-habit-icon food">
                  <Utensils size={21} />
                </span>
                <span>
                  <strong>Alimentação</strong>
                  <small>
                    {mealsDone}/{requiredMeals.length} refeições essenciais
                  </small>
                </span>
                <ChevronRight size={17} />
              </button>
            </div>
          </section>
          <section className="home-consistency">
            <div className="home-section-heading">
              <h2>Você está construindo</h2>
              <Sparkles size={18} />
            </div>
            <p>
              Um pouco de constância.
              <br />
              <strong>Muito de você.</strong>
            </p>
            <div
              className="home-week-goal"
              role="progressbar"
              aria-label="Dias de treino na semana"
              aria-valuenow={weekDays}
              aria-valuemin={0}
              aria-valuemax={Math.max(plannedDays, weekDays, 1)}
            >
              {Array.from({ length: Math.max(plannedDays, 1) }, (_, index) => (
                <span className={index < weekDays ? 'is-done' : ''} key={index}>
                  {index < weekDays ? <Check size={16} /> : <Dumbbell size={16} />}
                </span>
              ))}
            </div>
            <small>
              {weekDays
                ? `${weekDays} de ${plannedDays} dias planejados nesta semana.`
                : 'Sua semana começa com o primeiro treino.'}
            </small>
            <button className="text-button" type="button" onClick={() => onSelectTab('progress')}>
              Acompanhar evolução <ArrowRight size={15} />
            </button>
          </section>
          {nextMeal && (
            <button className="home-next-meal" type="button" onClick={() => onSelectTab('diet')}>
              <span className="home-habit-icon food">
                <Utensils size={20} />
              </span>
              <span>
                <small>PRÓXIMA REFEIÇÃO · {nextMeal.time}</small>
                <strong>{nextMeal.title}</strong>
              </span>
              <ArrowRight size={16} />
            </button>
          )}
          <RankCard rank={data.rank} onClick={() => onSelectTab('progress')} />
        </aside>
      </div>
      <p className="home-footer">Feito para a sua vida real. Um dia de cada vez.</p>
    </div>
  );
}
