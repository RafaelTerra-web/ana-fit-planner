import type { Goals, Meal, Profile } from '../types';
import { calculateDynamicGoals, calculateMealPlan } from '../utils/dietCalculator';

export const defaultProfile: Profile = {
  name: 'Ana',
  heightCm: 165,
  weightKg: 62,
  trainingDays: 4,
  cardioDays: 3,
  preferredFoods: [
    'Peito de frango',
    'Arroz',
    'Feijão',
    'Farofa',
    'Batata inglesa',
    'Batata palha',
    'Pão com queijo',
    'Presunto',
  ],
  avoidedFoods: ['Verduras', 'Legumes', 'Saladas'],
  theme: 'dark',
};

export const defaultGoals: Goals = calculateDynamicGoals(defaultProfile);

export const defaultMeals: Meal[] = calculateMealPlan(defaultProfile, defaultGoals);

export const cuttingRules = [
  'Perder gordura sem derrubar demais a performance do treino.',
  'Manter déficit moderado, sem cortar carboidrato de forma agressiva.',
  'Proteína alta todos os dias.',
  'Avaliar peso pela média semanal, não por um dia isolado.',
  'Se o peso cair rápido demais e o treino piorar, subir um pouco as calorias.',
  'Se o peso não cair por 2 semanas, reduzir 100 a 150 kcal ou aumentar cardio leve.',
];
