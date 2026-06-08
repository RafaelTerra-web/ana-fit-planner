import type { Goals, Meal, Profile } from '../types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}

export function calculateDynamicGoals(profile: Profile): Goals {
  const weight = profile.weightKg || 62;
  const trainingDays = profile.trainingDays || 4;
  const cardioDays = profile.cardioDays || 3;
  const estimatedMaintenance = weight * 26 + trainingDays * 45 + cardioDays * 25;
  const calories = roundToNearest(clamp(estimatedMaintenance - 250, 1500, 1900), 25);
  const protein = roundToNearest(clamp(weight * 1.9, 105, 145), 5);
  const fat = roundToNearest(clamp(weight * 0.8, 45, 60), 5);
  const waterLiters = Number(clamp(weight * 0.035, 2, 3).toFixed(1));

  return { calories, protein, fat, waterLiters };
}

export function calculateMealPlan(profile: Profile, goals: Goals): Meal[] {
  const fallbackGoals = calculateDynamicGoals(profile);
  const calories = goals.calories || fallbackGoals.calories;
  const protein = goals.protein || fallbackGoals.protein;
  const fat = goals.fat || fallbackGoals.fat;
  const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4));
  const chickenGrams = protein >= 125 ? 150 : protein >= 115 ? 140 : 125;
  const riceGrams = calories >= 1750 ? 140 : calories >= 1650 ? 120 : 95;
  const beansGrams = calories >= 1650 ? 100 : 80;
  const potatoGrams = calories >= 1750 ? 180 : calories >= 1650 ? 150 : 120;
  const breadGrams = calories >= 1700 ? 55 : 50;
  const cheeseGrams = fat >= 55 ? 25 : 20;
  const farofaGrams = calories >= 1700 ? 15 : 10;
  const hamGrams = 25;
  const shreddedChickenGrams = protein >= 125 ? 80 : 60;
  const breakfastProtein = protein >= 125 ? '1 ovo inteiro (50 g)' : '1 ovo inteiro opcional (50 g)';
  const snackOption =
    protein >= 125
      ? `${shreddedChickenGrams} g de frango desfiado com ${breadGrams} g de pão`
      : `${breadGrams} g de pão com ${cheeseGrams} g de queijo`;
  const breakfastCalories = Math.round(calories * 0.2);
  const lunchCalories = Math.round(calories * 0.35);
  const snackCalories = Math.round(calories * 0.2);
  const breakfastProteinTarget = Math.round(protein * 0.15);
  const lunchProtein = Math.round(protein * 0.4);
  const snackProtein = Math.round(protein * 0.2);
  const breakfastCarbs = Math.round(carbs * 0.25);
  const lunchCarbs = Math.round(carbs * 0.35);
  const snackCarbs = Math.round(carbs * 0.2);
  const breakfastFat = Math.round(fat * 0.3);
  const lunchFat = Math.round(fat * 0.22);
  const snackFat = Math.round(fat * 0.22);

  return [
    {
      id: 'cafe',
      title: 'Café da manhã',
      time: 'Manhã',
      calories: breakfastCalories,
      protein: breakfastProteinTarget,
      carbs: breakfastCarbs,
      fat: breakfastFat,
      items: [`${breadGrams} g de pão francês ou pão de forma`, `${cheeseGrams} g de queijo`, `${hamGrams} g de presunto`, breakfastProtein],
      note: 'As quantidades se ajustam pelas metas em Ajustes. Sem verdura forçada no plano principal.',
    },
    {
      id: 'almoco',
      title: 'Almoço',
      time: 'Meio do dia',
      calories: lunchCalories,
      protein: lunchProtein,
      carbs: lunchCarbs,
      fat: lunchFat,
      items: [`${chickenGrams} g de peito de frango`, `${riceGrams} g de arroz cozido`, `${beansGrams} g de feijão`, `${farofaGrams} g de farofa`],
      note: 'Se as calorias baixarem, cortar primeiro farofa ou batata palha antes de mexer na proteína.',
    },
    {
      id: 'lanche',
      title: 'Lanche',
      time: 'Tarde',
      calories: snackCalories,
      protein: snackProtein,
      carbs: snackCarbs,
      fat: snackFat,
      items: [snackOption, `${cheeseGrams} g de queijo se trocar por pão com queijo`, '80 g de banana opcional, se ela aceitar'],
      note: 'Em dia de treino fraco, concentrar mais carboidrato antes do treino.',
    },
    {
      id: 'jantar',
      title: 'Jantar',
      time: 'Noite',
      calories: calories - breakfastCalories - lunchCalories - snackCalories,
      protein: protein - breakfastProteinTarget - lunchProtein - snackProtein,
      carbs: carbs - breakfastCarbs - lunchCarbs - snackCarbs,
      fat: fat - breakfastFat - lunchFat - snackFat,
      items: [`${chickenGrams} g de peito de frango`, `${potatoGrams} g de batata inglesa ou ${riceGrams} g de arroz`, `${beansGrams} g de feijão`, 'Farofa: 0 a 10 g, se ainda couber nas metas'],
      note: 'Batata palha fica como detalhe, não como base da refeição.',
    },
  ];
}
