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
  const completedSets = log?.sets.filter((set) => set.completed) ?? [];
  if (!completedSets.length) {
    return 'Comece pela execução. A sugestão se adapta quando você conclui as séries.';
  }

  const maxRep = maxRepFromRange(exercise.reps);
  const hasProgressData = completedSets.every((set) => set.reps.trim() !== '' && set.rir.trim() !== '');
  const completedPlannedSets = Math.min(completedSets.length, log?.plannedSetCount ?? exercise.sets);
  const missingSets = Math.max(0, (log?.plannedSetCount ?? exercise.sets) - completedPlannedSets);

  if (!hasProgressData) {
    return 'Preencha repetições e RIR das séries concluídas para receber uma sugestão de progressão.';
  }

  if (missingSets > 0) {
    return `${missingSets} ${missingSets === 1 ? 'série planejada falta' : 'séries planejadas faltam'}. Mantenha a técnica antes de pensar em subir a carga.`;
  }

  const allSetsHitTop = maxRep ? completedSets.every((set) => Number(set.reps) >= maxRep) : false;
  const allSetsControlled = completedSets.every((set) => Number(set.rir) >= 1 && Number(set.rir) <= 2);
  const reachedFailure = completedSets.some((set) => Number(set.rir) === 0 && Number(set.reps) > 0);

  if (allSetsHitTop && allSetsControlled) {
    return exercise.progressionType === 'large'
      ? 'Faixa alta em todas as séries. Na próxima sessão, teste +2 a 5 kg mantendo a execução.'
      : 'Faixa alta em todas as séries. Na próxima, teste o menor incremento disponível.';
  }

  if (reachedFailure) {
    return 'Houve série no limite. Mantenha a carga até repetir o desempenho com 1–2 repetições na reserva.';
  }

  return 'Boa sessão. Repita a carga até atingir o topo da faixa em todas as séries com controle.';
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
