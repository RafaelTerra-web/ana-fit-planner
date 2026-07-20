import { Clock3, Info, Leaf, Utensils } from 'lucide-react';
import { AssignedNutritionPlanDetails, AssignedNutritionPlanGuidance } from '../components/AssignedNutritionPlanDetails';
import { Card } from '../components/Card';
import { MealCard } from '../components/MealCard';
import { ProgressBar } from '../components/ProgressBar';
import { getInitialPlanRules } from '../data/dietPlan';
import { getFoodsForProfile } from '../data/foods';
import { getTodayPlan } from '../data/workoutPlan';
import type { AppData, DailyChecks, FitnessObjective } from '../types';
import { getFitnessObjective } from '../utils/dietCalculator';
import { getActiveMealDay, getApplicableMeals, getRequiredMeals, mealMacro } from '../utils/meals';
import { getDietSuggestions } from '../utils/progressRules';

type DietProps = {
  data: AppData;
  todayChecks: DailyChecks;
  onToggleMeal: (mealId: string) => void;
};

const foodLabels = {
  proteins: 'Proteínas',
  carbs: 'Carboidratos',
  fats: 'Gorduras',
};

const objectiveLabels: Record<FitnessObjective, string> = {
  'body-recomposition': 'Recomposição corporal',
  'fat-loss': 'Perda de gordura',
  'muscle-gain': 'Ganho de massa',
  performance: 'Performance',
};

export function Diet({ data, todayChecks, onToggleMeal }: DietProps) {
  const assignedPlan = data.assignedNutritionPlan;
  const flexiblePlan = assignedPlan?.mealStrategy === 'flexible';
  const activeMealDay = getActiveMealDay(getTodayPlan(data.weekPlan).activityType);
  const applicableMeals = getApplicableMeals(data.meals, activeMealDay);
  const dismissedMealCount = data.meals.length - applicableMeals.length;
  const requiredMeals = getRequiredMeals(data.meals, activeMealDay);
  const totalCalories = requiredMeals.reduce((total, meal) => total + mealMacro(meal, 'calories'), 0);
  const totalProtein = requiredMeals.reduce((total, meal) => total + mealMacro(meal, 'protein'), 0);
  const completedMeals = applicableMeals.filter((meal) => todayChecks.meals[meal.id]);
  const completedRequiredMeals = requiredMeals.filter((meal) => todayChecks.meals[meal.id]);
  const consumedCalories = completedMeals.reduce((total, meal) => total + mealMacro(meal, 'calories'), 0);
  const consumedProtein = completedMeals.reduce((total, meal) => total + mealMacro(meal, 'protein'), 0);
  const consumedCarbs = completedMeals.reduce((total, meal) => total + mealMacro(meal, 'carbs'), 0);
  const consumedFat = completedMeals.reduce((total, meal) => total + mealMacro(meal, 'fat'), 0);
  const calorieProgress = Math.round((consumedCalories / data.goals.calories) * 100);
  const proteinProgress = Math.round((consumedProtein / data.goals.protein) * 100);
  const nextMeal = requiredMeals.find((meal) => !todayChecks.meals[meal.id]);
  const suggestions = getDietSuggestions(data.meals, data.goals, data.progressEntries, data.profile);
  const initialPlanRules = getInitialPlanRules(data.profile);
  const compatibleFoods = getFoodsForProfile(data.profile);
  const objective = getFitnessObjective(data.profile);

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <p className="text-sm font-semibold text-rose-700">
          {assignedPlan ? 'Plano nutricional atribuído' : `Plano inicial · ${objectiveLabels[objective]}`}
        </p>
        <h1 className="page-title mt-1">Dieta</h1>
        {!assignedPlan ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Estimativa inicial baseada no objetivo, na rotina e nas preferências informadas. Você pode ajustar tudo nos Ajustes.
          </p>
        ) : null}
      </header>

      {nextMeal ? (
        <Card className="overflow-hidden border-teal-300/20 bg-gradient-to-br from-teal-300/10 via-slate-900 to-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Próxima refeição</p>
              <h2 className="mt-2 text-xl font-black text-slate-50">{nextMeal.title}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-400">
                <Clock3 size={15} aria-hidden="true" /> {nextMeal.time}
                {!flexiblePlan && typeof nextMeal.calories === 'number' ? ` · ${nextMeal.calories} kcal` : null}
              </p>
            </div>
            <button className="primary-button shrink-0 px-3" type="button" onClick={() => onToggleMeal(nextMeal.id)}>
              Concluir
            </button>
          </div>
        </Card>
      ) : (
        <Card className="border-lime-300/20 bg-lime-300/[0.07]">
          <p className="font-extrabold text-lime-200">Refeições essenciais concluídas hoje.</p>
          {applicableMeals.some((meal) => meal.optional && !todayChecks.meals[meal.id]) ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-400">As refeições opcionais continuam disponíveis, sem obrigação.</p>
          ) : null}
        </Card>
      )}

      {assignedPlan ? <AssignedNutritionPlanDetails plan={assignedPlan} /> : null}

      {!flexiblePlan ? <Card>
        <div className="flex items-center gap-2">
          <Utensils className="text-rose-700" size={20} aria-hidden="true" />
          <h2 className="section-title">Consumido hoje</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Energia</p>
            <p className="mt-1 text-lg font-black text-slate-50">{consumedCalories} kcal</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">faltam {Math.max(0, data.goals.calories - consumedCalories)} kcal</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Proteína</p>
            <p className="mt-1 text-lg font-black text-slate-50">{consumedProtein} g</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">meta {data.goals.protein} g</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Carboidratos</p>
            <p className="mt-1 text-lg font-black text-slate-50">{consumedCarbs} g</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Gorduras</p>
            <p className="mt-1 text-lg font-black text-slate-50">{consumedFat} g</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Água</p>
            <p className="mt-1 text-lg font-black text-slate-50">{data.goals.waterLiters} L</p>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <ProgressBar value={calorieProgress} label={`${consumedCalories} de ${data.goals.calories} kcal`} tone="amber" />
          <ProgressBar value={proteinProgress} label={`${consumedProtein} de ${data.goals.protein} g de proteína`} tone="teal" />
        </div>
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
          O plano completo soma {totalCalories} kcal e {totalProtein} g de proteína. Aqui entram somente as refeições marcadas hoje.
        </p>
      </Card> : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="section-title">Refeições</h2>
          <span className="text-xs font-bold text-slate-500">
            {completedRequiredMeals.length}/{requiredMeals.length} essenciais
          </span>
        </div>
        {dismissedMealCount > 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold leading-relaxed text-slate-500">
            {dismissedMealCount} {dismissedMealCount === 1 ? 'refeição dispensada' : 'refeições dispensadas'} hoje por não se aplicar a este dia.
          </p>
        ) : null}
        {applicableMeals.map((meal) => (
          <MealCard
            meal={meal}
            key={meal.id}
            done={Boolean(todayChecks.meals[meal.id])}
            showMacros={!flexiblePlan}
            onToggle={() => onToggleMeal(meal.id)}
          />
        ))}
      </section>

      {assignedPlan ? <AssignedNutritionPlanGuidance plan={assignedPlan} /> : null}

      {!assignedPlan ? (
        <>
      <Card>
        <div className="flex items-center gap-2">
          <Info className="text-teal-700" size={20} aria-hidden="true" />
          <h2 className="section-title">Como usar esta estimativa</h2>
        </div>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
          {initialPlanRules.map((rule) => (
            <li className="flex gap-2" key={rule}>
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <Leaf className="text-rose-700" size={20} aria-hidden="true" />
          <h2 className="section-title">Alimentos compatíveis</h2>
        </div>
        <div className="mt-4 space-y-4">
          {(['proteins', 'carbs', 'fats'] as const).map((group) => (
            <div key={group}>
              <h3 className="text-sm font-bold text-slate-900">{foodLabels[group]}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {compatibleFoods
                  .filter((food) => food.group === group)
                  .map((food) => (
                    <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700" key={`${group}-${food.name}`}>
                      {food.name}
                      {food.note ? <span className="block pt-1 text-xs font-medium text-slate-500">{food.note}</span> : null}
                    </span>
                  ))}
                {!compatibleFoods.some((food) => food.group === group) ? (
                  <span className="text-sm font-medium text-slate-500">Sem sugestão automática para este grupo.</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="section-title">Observações automáticas</h2>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
          {suggestions.map((suggestion) => (
            <li className="flex gap-2" key={suggestion}>
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </Card>
        </>
      ) : null}
    </div>
  );
}
