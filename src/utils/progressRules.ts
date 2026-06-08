import type { Exercise, ExerciseLog, Goals, Meal, ProgressEntry } from '../types';
import { compareWeeklyWeight } from './calculations';

function maxRepFromRange(range: string) {
  const matches = range.match(/\d+/g);
  if (!matches?.length) {
    return null;
  }

  return Number(matches[matches.length - 1]);
}

export function getExerciseFeedback(exercise: Exercise, log?: ExerciseLog) {
  if (!log?.done) {
    return 'Execução primeiro, carga depois.';
  }

  const maxRep = maxRepFromRange(exercise.reps);
  const reportedReps = Number(log.reps);
  const rir = Number(log.rir);
  const hasProgressData = log.reps.trim() !== '' && log.rir.trim() !== '';

  if (!hasProgressData) {
    return 'Exercício marcado. Preencha repetições e RIR para gerar uma sugestão de carga.';
  }

  if (maxRep && reportedReps >= maxRep && rir >= 1 && rir <= 2) {
    return exercise.progressionType === 'large'
      ? 'Boa. Dá para tentar subir +2 a 5 kg na próxima.'
      : 'Boa. Dá para tentar subir 1 placa ou o menor incremento.';
  }

  if (rir === 0 && reportedReps > 0) {
    return 'Você chegou perto da falha. Mantenha a carga até controlar melhor a execução.';
  }

  return 'Mantenha a carga até bater todas as séries com boa execução.';
}

export function getDietSuggestions(meals: Meal[], goals: Goals, progressEntries: ProgressEntry[]) {
  const totalCalories = meals.reduce((total, meal) => total + meal.calories, 0);
  const totalProtein = meals.reduce((total, meal) => total + meal.protein, 0);
  const comparison = compareWeeklyWeight(progressEntries);
  const suggestions: string[] = [];

  if (totalProtein < goals.protein) {
    suggestions.push('Proteína baixa: reforçar frango, ovo ou queijo.');
  }

  if (totalCalories > goals.calories) {
    suggestions.push('Calorias altas: reduzir farofa, batata palha, queijo ou um pouco do arroz.');
  }

  if (comparison.previous && comparison.percent <= -0.8) {
    suggestions.push('Peso caiu rápido: se treino piorar, subir um pouco as calorias.');
  }

  if (comparison.previous && comparison.percent >= -0.1) {
    suggestions.push('Peso quase não caiu: se repetir por 2 semanas, reduzir 100 a 150 kcal ou aumentar cardio leve.');
  }

  suggestions.push('Treino fraco: colocar mais carboidrato antes do treino pode ajudar.');
  suggestions.push('Fome alta: trocar parte por batata inglesa e dividir melhor as refeições.');

  return suggestions;
}
