import type { EatingStyle, FitnessObjective, Goals, Meal, Profile } from '../types';

type FoodOption = {
  name: string;
  aliases?: string[];
  styles?: EatingStyle[];
};

type MealSlot = {
  id: string;
  title: string;
  time: string;
  proteinOptions: FoodOption[];
  carbOptions: FoodOption[];
  fatOptions: FoodOption[];
};

const allStyles: EatingStyle[] = ['omnivore', 'flexitarian', 'vegetarian', 'vegan', 'pescatarian'];
const allObjectives: FitnessObjective[] = ['body-recomposition', 'fat-loss', 'muscle-gain', 'performance'];
const plantBasedStyles: EatingStyle[] = [...allStyles];
const eggAndDairyStyles: EatingStyle[] = ['omnivore', 'flexitarian', 'vegetarian', 'pescatarian'];
const fishStyles: EatingStyle[] = ['omnivore', 'flexitarian', 'pescatarian'];
const meatStyles: EatingStyle[] = ['omnivore', 'flexitarian'];

const tofu: FoodOption = { name: 'tofu', aliases: ['soja'], styles: plantBasedStyles };
const beans: FoodOption = { name: 'feijão', aliases: ['leguminosa'], styles: plantBasedStyles };
const lentils: FoodOption = { name: 'lentilha', aliases: ['leguminosa'], styles: plantBasedStyles };
const chickpeas: FoodOption = { name: 'grão-de-bico', aliases: ['grao de bico', 'leguminosa'], styles: plantBasedStyles };
const soyProtein: FoodOption = {
  name: 'proteína de soja',
  aliases: ['soja', 'proteina vegetal'],
  styles: plantBasedStyles,
};
const plantYogurt: FoodOption = {
  name: 'iogurte vegetal sem açúcar',
  aliases: ['iogurte', 'soja', 'coco'],
  styles: plantBasedStyles,
};
const eggs: FoodOption = {
  name: 'ovos',
  aliases: ['ovo'],
  styles: eggAndDairyStyles,
};
const yogurt: FoodOption = {
  name: 'iogurte natural',
  aliases: ['leite', 'lactose', 'laticínio', 'laticinios'],
  styles: eggAndDairyStyles,
};
const cheese: FoodOption = {
  name: 'queijo branco',
  aliases: ['queijo', 'leite', 'lactose', 'laticínio', 'laticinios'],
  styles: eggAndDairyStyles,
};
const fish: FoodOption = {
  name: 'peixe',
  aliases: ['atum', 'salmão', 'salmao', 'pescado'],
  styles: fishStyles,
};
const chicken: FoodOption = {
  name: 'frango',
  aliases: ['carne', 'ave', 'aves'],
  styles: meatStyles,
};
const leanBeef: FoodOption = {
  name: 'carne bovina magra',
  aliases: ['carne', 'bovina', 'boi'],
  styles: meatStyles,
};

const rice: FoodOption = { name: 'arroz', styles: allStyles };
const potatoes: FoodOption = { name: 'batata', aliases: ['batata inglesa', 'batata doce'], styles: allStyles };
const oats: FoodOption = { name: 'aveia', aliases: ['glúten', 'gluten'], styles: allStyles };
const tapioca: FoodOption = { name: 'tapioca', styles: allStyles };
const fruit: FoodOption = { name: 'fruta da preferência', aliases: ['fruta', 'banana', 'maçã', 'maca'], styles: allStyles };
const veganBread: FoodOption = {
  name: 'pão integral sem ingredientes de origem animal',
  aliases: ['pão', 'pao', 'trigo', 'glúten', 'gluten'],
  styles: allStyles,
};

const oliveOil: FoodOption = { name: 'azeite', styles: allStyles };
const avocado: FoodOption = { name: 'abacate', styles: allStyles };
const peanutPaste: FoodOption = {
  name: 'pasta de amendoim',
  aliases: ['amendoim', 'oleaginosa', 'oleaginosas'],
  styles: allStyles,
};
const tahini: FoodOption = {
  name: 'tahine',
  aliases: ['gergelim', 'semente', 'sementes'],
  styles: allStyles,
};
const nuts: FoodOption = {
  name: 'castanhas',
  aliases: ['castanha', 'oleaginosa', 'oleaginosas', 'nozes'],
  styles: allStyles,
};

const mealSlots: Record<string, MealSlot> = {
  breakfast: {
    id: 'cafe',
    title: 'Café da manhã',
    time: 'Manhã',
    proteinOptions: [eggs, yogurt, tofu, plantYogurt, chickpeas],
    carbOptions: [oats, veganBread, tapioca, fruit],
    fatOptions: [peanutPaste, avocado, tahini, nuts],
  },
  morningSnack: {
    id: 'lanche-manha',
    title: 'Lanche da manhã',
    time: 'Meio da manhã',
    proteinOptions: [yogurt, cheese, plantYogurt, chickpeas, tofu],
    carbOptions: [fruit, oats, veganBread, tapioca],
    fatOptions: [nuts, peanutPaste, tahini, avocado],
  },
  lunch: {
    id: 'almoco',
    title: 'Almoço',
    time: 'Meio do dia',
    proteinOptions: [chicken, fish, eggs, tofu, beans, lentils, soyProtein],
    carbOptions: [rice, potatoes, chickpeas],
    fatOptions: [oliveOil, avocado, tahini, nuts],
  },
  afternoonSnack: {
    id: 'lanche',
    title: 'Lanche da tarde',
    time: 'Tarde',
    proteinOptions: [yogurt, cheese, eggs, plantYogurt, tofu, chickpeas],
    carbOptions: [fruit, veganBread, oats, tapioca],
    fatOptions: [peanutPaste, nuts, tahini, avocado],
  },
  dinner: {
    id: 'jantar',
    title: 'Jantar',
    time: 'Noite',
    proteinOptions: [leanBeef, chicken, fish, eggs, tofu, lentils, soyProtein],
    carbOptions: [rice, potatoes, beans],
    fatOptions: [oliveOil, avocado, tahini, nuts],
  },
  supper: {
    id: 'ceia',
    title: 'Ceia',
    time: 'Antes de dormir',
    proteinOptions: [yogurt, cheese, plantYogurt, tofu, chickpeas],
    carbOptions: [fruit, oats, veganBread, tapioca],
    fatOptions: [nuts, peanutPaste, tahini, avocado],
  },
};

const slotsByMealCount: Record<3 | 4 | 5 | 6, MealSlot[]> = {
  3: [mealSlots.breakfast, mealSlots.lunch, mealSlots.dinner],
  4: [mealSlots.breakfast, mealSlots.lunch, mealSlots.afternoonSnack, mealSlots.dinner],
  5: [mealSlots.breakfast, mealSlots.morningSnack, mealSlots.lunch, mealSlots.afternoonSnack, mealSlots.dinner],
  6: [
    mealSlots.breakfast,
    mealSlots.morningSnack,
    mealSlots.lunch,
    mealSlots.afternoonSnack,
    mealSlots.dinner,
    mealSlots.supper,
  ],
};

const weightsByMealCount: Record<3 | 4 | 5 | 6, number[]> = {
  3: [0.25, 0.4, 0.35],
  4: [0.2, 0.35, 0.2, 0.25],
  5: [0.18, 0.12, 0.3, 0.15, 0.25],
  6: [0.16, 0.1, 0.28, 0.12, 0.22, 0.12],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasTextMatch(left: string, right: string) {
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function optionMatchesTerms(option: FoodOption, terms: string[]) {
  const optionTerms = [option.name, ...(option.aliases ?? [])].map(normalizeText);
  return terms.some((term) => optionTerms.some((optionTerm) => hasTextMatch(optionTerm, term)));
}

function isOptionAllowed(option: FoodOption, profile: Profile) {
  const requestedStyle = profile.eatingStyle;
  const style = requestedStyle && allStyles.includes(requestedStyle) ? requestedStyle : 'omnivore';
  const allowedByStyle = (option.styles ?? allStyles).includes(style);
  const avoidedTerms = (profile.avoidedFoods ?? []).map(normalizeText).filter(Boolean);
  return allowedByStyle && !optionMatchesTerms(option, avoidedTerms);
}

function chooseOption(options: FoodOption[], profile: Profile, fallback: string) {
  const compatible = options.filter((option) => isOptionAllowed(option, profile));
  if (!compatible.length) return fallback;

  const preferredTerms = (profile.preferredFoods ?? []).map(normalizeText).filter(Boolean);
  return compatible.find((option) => optionMatchesTerms(option, preferredTerms))?.name ?? compatible[0].name;
}

function allocateTotal(total: number, weights: number[]) {
  const normalizedTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const allocations = weights.map((weight) => Math.round(normalizedTotal * weight));
  const currentTotal = allocations.reduce((sum, value) => sum + value, 0);
  allocations[allocations.length - 1] += normalizedTotal - currentTotal;
  return allocations;
}

function getMealCount(profile: Profile): 3 | 4 | 5 | 6 {
  const requested = Number(profile.mealsPerDay);
  if (requested === 3 || requested === 4 || requested === 5 || requested === 6) return requested;
  return 4;
}

export function getFitnessObjective(profile: Profile): FitnessObjective {
  const requested = profile.objective;
  return requested && allObjectives.includes(requested) ? requested : 'body-recomposition';
}

export function isFoodCompatible(
  name: string,
  profile: Profile,
  aliases: string[] = [],
  styles: EatingStyle[] = allStyles,
) {
  return isOptionAllowed({ name, aliases, styles }, profile);
}

export function calculateDynamicGoals(profile: Profile): Goals {
  const weight = clamp(profile.weightKg || 62, 35, 300);
  const height = clamp(profile.heightCm || 165, 120, 230);
  const trainingDays = clamp(Number.isFinite(profile.trainingDays) ? profile.trainingDays : 4, 0, 7);
  const cardioDays = clamp(Number.isFinite(profile.cardioDays) ? profile.cardioDays : 2, 0, 7);
  const objective = getFitnessObjective(profile);
  const isMinor = typeof profile.age === 'number' && Number.isFinite(profile.age) && profile.age < 18;
  const estimatedMaintenance = roundToNearest(
    clamp(weight * 24 + height * 2 + trainingDays * 45 + cardioDays * 25, 1400, 4200),
    25,
  );
  const adultAdjustment = {
    'body-recomposition': -100,
    'fat-loss': -250,
    'muscle-gain': 200,
    performance: 0,
  }[objective];
  const calorieAdjustment = isMinor && adultAdjustment < 0 ? 0 : adultAdjustment;
  const proteinMultiplier = objective === 'performance' ? 1.6 : objective === 'body-recomposition' ? 1.7 : 1.8;
  const protein = roundToNearest(clamp(weight * proteinMultiplier, 50, 220), 5);
  const fat = roundToNearest(clamp(weight * 0.8, 35, 120), 5);
  const minimumForMacros = protein * 4 + fat * 9 + 80 * 4;
  const calories = roundToNearest(clamp(Math.max(estimatedMaintenance + calorieAdjustment, minimumForMacros), 1400, 4400), 25);
  const waterLiters = Number(clamp(weight * 0.035, 1.5, 4.5).toFixed(1));

  return { calories, protein, fat, waterLiters };
}

export function calculateMealPlan(profile: Profile, goals: Goals): Meal[] {
  const fallbackGoals = calculateDynamicGoals(profile);
  const calories = goals.calories || fallbackGoals.calories;
  const protein = goals.protein || fallbackGoals.protein;
  const fat = goals.fat || fallbackGoals.fat;
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const mealCount = getMealCount(profile);
  const slots = slotsByMealCount[mealCount];
  const weights = weightsByMealCount[mealCount];
  const caloriesByMeal = allocateTotal(calories, weights);
  const proteinByMeal = allocateTotal(protein, weights);
  const carbsByMeal = allocateTotal(carbs, weights);
  const fatByMeal = allocateTotal(fat, weights);

  return slots.map((slot, index) => ({
    id: slot.id,
    title: slot.title,
    time: slot.time,
    calories: caloriesByMeal[index],
    protein: proteinByMeal[index],
    carbs: carbsByMeal[index],
    fat: fatByMeal[index],
    items: [
      `1 porção de ${chooseOption(slot.proteinOptions, profile, 'fonte proteica compatível com suas restrições')}`,
      `1 porção de ${chooseOption(slot.carbOptions, profile, 'fonte de carboidrato compatível com suas restrições')}`,
      `1 pequena porção de ${chooseOption(slot.fatOptions, profile, 'fonte de gorduras compatível com suas restrições')}`,
    ],
    note: 'Estimativa inicial: ajuste as porções à sua rotina e, se necessário, com orientação profissional.',
  }));
}
