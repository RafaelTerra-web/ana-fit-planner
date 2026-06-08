import type { DailyChecks, Goals, ProgressEntry } from '../types';

export function calculateBmi(weightKg: number, heightCm: number) {
  const heightM = heightCm / 100;
  if (!weightKg || !heightM) {
    return 0;
  }

  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

export function estimateProtein(weightKg: number) {
  return {
    low: Math.round(weightKg * 1.8),
    high: Math.round(weightKg * 2),
  };
}

export function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) {
    return 0;
  }

  return validValues.reduce((total, value) => total + value, 0) / validValues.length;
}

export function getWeeklyWeightAverage(entries: ProgressEntry[], weekOffset = 0) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() - weekOffset * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return average(
    entries
      .filter((entry) => {
        const date = new Date(entry.date);
        return date >= start && date < end;
      })
      .map((entry) => entry.weightKg)
  );
}

export function compareWeeklyWeight(entries: ProgressEntry[]) {
  const current = getWeeklyWeightAverage(entries, 0);
  const previous = getWeeklyWeightAverage(entries, 1);

  if (!current || !previous) {
    return { current, previous, delta: 0, percent: 0 };
  }

  const delta = current - previous;
  const percent = (delta / previous) * 100;
  return {
    current: Number(current.toFixed(1)),
    previous: Number(previous.toFixed(1)),
    delta: Number(delta.toFixed(1)),
    percent: Number(percent.toFixed(1)),
  };
}

export function suggestCalorieAdjustment(entries: ProgressEntry[], currentGoals: Goals) {
  const comparison = compareWeeklyWeight(entries);

  if (!comparison.previous) {
    return 'Registre pelo menos 2 semanas para ter uma sugestao mais precisa.';
  }

  if (comparison.percent <= -0.8) {
    return `Peso caiu ${Math.abs(comparison.percent)}% na semana. Se treino ou energia piorarem, subir 100 kcal pode ajudar.`;
  }

  if (comparison.percent >= -0.1) {
    return `Se isso se repetir por 2 semanas, testar ${currentGoals.calories - 100} a ${currentGoals.calories - 150} kcal ou mais cardio leve.`;
  }

  return 'Ritmo bom. Manter as metas e observar performance, fome e medidas.';
}

export function calculateAdherence(checks: DailyChecks[], key: 'trainingDone' | 'cardioDone', planned: number) {
  if (!planned) {
    return 0;
  }

  const done = checks.filter((check) => check[key]).length;
  return Math.min(100, Math.round((done / planned) * 100));
}

export function getWeekCheckEntries(dailyChecks: Record<string, DailyChecks>, date = new Date()) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const itemDate = new Date(start);
    itemDate.setDate(start.getDate() + index);
    const key = itemDate.toISOString().slice(0, 10);
    return dailyChecks[key];
  }).filter(Boolean);
}
