import type { Goals, Meal, Profile } from '../types';
import { calculateDynamicGoals, calculateMealPlan, getFitnessObjective } from '../utils/dietCalculator';

export const defaultProfile: Profile = {
  name: 'Atleta',
  heightCm: 165,
  weightKg: 62,
  trainingDays: 4,
  cardioDays: 2,
  preferredFoods: [],
  avoidedFoods: [],
  theme: 'dark',
  objective: 'body-recomposition',
  eatingStyle: 'omnivore',
  mealsPerDay: 4,
};

export const defaultGoals: Goals = calculateDynamicGoals(defaultProfile);

export const defaultMeals: Meal[] = calculateMealPlan(defaultProfile, defaultGoals);

const rulesByObjective: Record<NonNullable<Profile['objective']>, string[]> = {
  'body-recomposition': [
    'Use as metas como ponto de partida e observe energia, treino e medidas ao longo das semanas.',
    'Mantenha fontes de proteína distribuídas nas refeições.',
    'Priorize consistência antes de alterar calorias ou porções.',
  ],
  'fat-loss': [
    'A estimativa inicial usa um ajuste calórico moderado apenas para adultos.',
    'Acompanhe a tendência das semanas, não mudanças isoladas de um dia.',
    'Se energia, bem-estar ou treino piorarem, reveja as metas com orientação profissional.',
  ],
  'muscle-gain': [
    'A estimativa inicial não aplica cutting e reserva mais energia para o objetivo.',
    'Distribua fontes de proteína e carboidrato ao longo da rotina.',
    'Ajuste porções pela evolução do treino e pela tendência das semanas.',
  ],
  performance: [
    'A estimativa inicial não aplica cutting automático.',
    'Distribua carboidratos ao redor do horário em que você costuma treinar.',
    'Observe recuperação, energia e consistência antes de ajustar as porções.',
  ],
};

export function getInitialPlanRules(profile: Profile) {
  const objective = getFitnessObjective(profile);
  const rules = [...rulesByObjective[objective]];

  if (typeof profile.age === 'number' && profile.age < 18) {
    rules.unshift('Para menores de 18 anos, o app não cria déficit automático; faça mudanças com um responsável e orientação profissional.');
  }

  rules.push('Este plano é uma estimativa inicial e não substitui acompanhamento individualizado.');
  return rules;
}
