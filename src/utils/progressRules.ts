import type { Exercise, ExerciseLog, Goals, Meal, Profile, ProgressEntry } from '../types';
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

export function getDietSuggestions(meals: Meal[], goals: Goals, progressEntries: ProgressEntry[], profile?: Profile) {
  const hasCalorieEstimates = meals.every((meal) => typeof meal.calories === 'number');
  const hasProteinEstimates = meals.every((meal) => typeof meal.protein === 'number');
  const totalCalories = meals.reduce((total, meal) => total + (meal.calories ?? 0), 0);
  const totalProtein = meals.reduce((total, meal) => total + (meal.protein ?? 0), 0);
  const comparison = compareWeeklyWeight(progressEntries);
  const objective = profile?.objective ?? 'body-recomposition';
  const isMinor = typeof profile?.age === 'number' && profile.age < 18;
  const suggestions: string[] = [];

  if (hasProteinEstimates && totalProtein < goals.protein) {
    suggestions.push('A soma estimada de proteína está abaixo da meta; reveja as porções com fontes compatíveis com seu estilo alimentar.');
  }

  if (hasCalorieEstimates && totalCalories !== goals.calories) {
    suggestions.push('As refeições não estão somando a meta de energia atual; gere o plano novamente antes de ajustar porções.');
  }

  if (objective === 'fat-loss' && !isMinor && comparison.previous && comparison.percent <= -0.8) {
    suggestions.push('A tendência de peso mudou rapidamente; observe também energia e treino antes de ajustar a estimativa.');
  }

  if (objective === 'muscle-gain' && comparison.previous && comparison.percent < 0) {
    suggestions.push('A tendência de peso está em queda; confira a regularidade das refeições e a evolução do treino.');
  }

  if (isMinor) {
    suggestions.push('O app não aplica déficit automático para menores de 18 anos; mudanças devem ser acompanhadas por responsável e profissional.');
  }

  suggestions.push('Use este plano como estimativa inicial e ajuste os horários à sua rotina.');
  suggestions.push('Observe energia, recuperação e consistência por algumas semanas antes de mudar as porções.');

  return suggestions;
}
