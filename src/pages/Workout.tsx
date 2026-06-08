import { CalendarDays, HeartPulse } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { ExerciseCard } from '../components/ExerciseCard';
import { ProgressBar } from '../components/ProgressBar';
import { getWorkoutById, weekPlan, workouts } from '../data/workoutPlan';
import type { AppData, DailyChecks, ExerciseLog, WeekPlanItem } from '../types';
import { calculateAdherence, getWeekCheckEntries } from '../utils/calculations';

type WorkoutProps = {
  data: AppData;
  todayChecks: DailyChecks;
  todayPlan: WeekPlanItem;
  onExerciseLogChange: (exerciseId: string, log: ExerciseLog) => void;
  onToggleCheck: (key: keyof Omit<DailyChecks, 'meals'>) => void;
};

export function Workout({ data, todayChecks, todayPlan, onExerciseLogChange, onToggleCheck }: WorkoutProps) {
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(todayPlan.workoutId ?? workouts[0].id);
  const selectedWorkout = getWorkoutById(selectedWorkoutId) ?? workouts[0];
  const weeklyChecks = useMemo(() => getWeekCheckEntries(data.dailyChecks), [data.dailyChecks]);
  const trainingAdherence = calculateAdherence(weeklyChecks, 'trainingDone', data.profile.trainingDays);
  const cardioAdherence = calculateAdherence(weeklyChecks, 'cardioDone', data.profile.cardioDays);

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <p className="text-sm font-semibold text-rose-700">Bom treino, {data.profile.name}</p>
        <h1 className="page-title mt-1">Treino</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Rotina com 4 dias de musculacao e 3 cardios leves.</p>
      </header>

      <div className="grid gap-3">
        <Card>
          <div className="flex items-center gap-2">
            <CalendarDays className="text-rose-700" size={20} aria-hidden="true" />
            <h2 className="section-title">Semana</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {weekPlan.map((item) => (
              <button
                type="button"
                className={`rounded-lg border p-3 text-left transition ${
                  selectedWorkoutId === item.workoutId
                    ? 'border-rose-300 bg-rose-50 text-rose-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
                key={item.dayLabel}
                onClick={() => item.workoutId && setSelectedWorkoutId(item.workoutId)}
              >
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.dayLabel}</span>
                <span className="mt-1 block text-sm font-bold">{item.title}</span>
                {item.cardio ? <span className="mt-1 block text-xs font-semibold text-teal-700">{item.cardio}</span> : null}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="section-title">Aderência semanal</h2>
          <div className="mt-4 space-y-4">
            <ProgressBar value={trainingAdherence} label="Treinos" tone="rose" />
            <ProgressBar value={cardioAdherence} label="Cardios" tone="teal" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="section-title">Hoje</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{todayPlan.title}</p>
          </div>
          {todayPlan.cardio ? <HeartPulse className="text-teal-700" size={22} aria-hidden="true" /> : null}
        </div>
        <div className="mt-4 grid gap-2">
          {todayPlan.workoutId ? (
            <button
              type="button"
              className={todayChecks.trainingDone ? 'primary-button bg-teal-700' : 'secondary-button'}
              onClick={() => onToggleCheck('trainingDone')}
            >
              {todayChecks.trainingDone ? 'Treino concluído' : 'Marcar treino de hoje'}
            </button>
          ) : null}
          {todayPlan.cardio ? (
            <button
              type="button"
              className={todayChecks.cardioDone ? 'primary-button bg-teal-700' : 'secondary-button'}
              onClick={() => onToggleCheck('cardioDone')}
            >
              {todayChecks.cardioDone ? 'Cardio concluído' : 'Marcar cardio de hoje'}
            </button>
          ) : null}
        </div>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="section-title">{selectedWorkout.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{selectedWorkout.focus}</p>
        </div>
        {selectedWorkout.exercises.map((exercise) => (
          <ExerciseCard
            exercise={exercise}
            key={exercise.id}
            log={data.exerciseLogs[exercise.id]}
            onChange={onExerciseLogChange}
          />
        ))}
      </section>
    </div>
  );
}
