import type { Meal, MealDayApplicability, WeekActivityType } from '../types';

export type ActiveMealDay = Exclude<MealDayApplicability, 'both'>;

export function normalizeMealDayApplicability(value: unknown): MealDayApplicability {
  return value === 'training' || value === 'rest' || value === 'both' ? value : 'both';
}

export function getActiveMealDay(activityType: WeekActivityType): ActiveMealDay {
  return activityType === 'rest' ? 'rest' : 'training';
}

export function isMealApplicable(meal: Meal, activeDay: ActiveMealDay) {
  const applicability = normalizeMealDayApplicability(meal.appliesTo);
  return applicability === 'both' || applicability === activeDay;
}

export function getApplicableMeals(meals: Meal[], activeDay: ActiveMealDay) {
  return meals.filter((meal) => isMealApplicable(meal, activeDay));
}

export function isRequiredMeal(meal: Meal) {
  return meal.optional !== true;
}

export function getRequiredMeals(meals: Meal[], activeDay?: ActiveMealDay) {
  return meals.filter((meal) => isRequiredMeal(meal) && (!activeDay || isMealApplicable(meal, activeDay)));
}

export function mealMacro(meal: Meal, field: 'calories' | 'protein' | 'carbs' | 'fat') {
  const value = meal[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
