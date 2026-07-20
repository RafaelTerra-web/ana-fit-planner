function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertFiniteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} precisa ser um número finito.`);
  }
}

function sumMeals(meals, field) {
  return meals.reduce((total, meal) => total + meal[field], 0);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isRange(value) {
  return isRecord(value) && Number.isFinite(value.min) && Number.isFinite(value.max);
}

function validateGoals(goals, label = 'goals') {
  if (!isRecord(goals)) {
    throw new Error(`${label} precisa ser um objeto completo.`);
  }

  for (const field of ['calories', 'protein', 'fat', 'waterLiters']) {
    assertFiniteNumber(goals[field], `${label}.${field}`);
  }
}

function isPlanList(value) {
  return Array.isArray(value) && value.every(
    (item) => isRecord(item) && typeof item.id === 'string' && typeof item.title === 'string' && isStringArray(item.items)
  );
}

function validateMealOption(option, mealId, optionIndex) {
  if (
    !isRecord(option) ||
    typeof option.id !== 'string' ||
    !option.id.trim() ||
    typeof option.title !== 'string' ||
    !option.title.trim() ||
    !isStringArray(option.items) ||
    option.items.length === 0 ||
    (option.note !== undefined && typeof option.note !== 'string')
  ) {
    throw new Error(`${mealId}.options[${optionIndex}] é inválida.`);
  }
}

export function validateAssignedNutritionPreset(preset) {
  if (!isRecord(preset) || !isRecord(preset.plan) || !isRecord(preset.profilePatch)) {
    throw new Error('Preset nutricional incompleto.');
  }

  const strategy = preset.plan.mealStrategy;
  if (strategy !== 'fixed' && strategy !== 'flexible') {
    throw new Error('mealStrategy precisa ser fixed ou flexible.');
  }
  if (typeof preset.plan.id !== 'string' || !preset.plan.id.trim()) {
    throw new Error('O plano atribuído precisa ter um id não vazio.');
  }
  if (!Number.isInteger(preset.plan.revision) || preset.plan.revision < 1) {
    throw new Error('A revisão do plano precisa ser um número inteiro positivo.');
  }
  if (
    typeof preset.plan.title !== 'string' ||
    typeof preset.plan.objective !== 'string' ||
    !isRecord(preset.plan.context) ||
    (preset.plan.context.avoidedFoods !== undefined && !isStringArray(preset.plan.context.avoidedFoods)) ||
    (preset.plan.context.notes !== undefined && !isStringArray(preset.plan.context.notes)) ||
    (preset.plan.mealWeightBasis !== undefined && typeof preset.plan.mealWeightBasis !== 'string') ||
    (preset.plan.portionGuidance !== undefined && !isStringArray(preset.plan.portionGuidance)) ||
    (preset.plan.macroEstimateNote !== undefined && typeof preset.plan.macroEstimateNote !== 'string') ||
    (preset.plan.restDayAdjustments !== undefined && !isStringArray(preset.plan.restDayAdjustments)) ||
    (preset.plan.substitutions !== undefined && !isPlanList(preset.plan.substitutions)) ||
    (preset.plan.guidance !== undefined && !isPlanList(preset.plan.guidance)) ||
    (preset.plan.disclaimer !== undefined && typeof preset.plan.disclaimer !== 'string')
  ) {
    throw new Error('A estrutura descritiva do plano é inválida.');
  }
  const targets = preset.plan.targets;
  if (targets !== undefined && !isRecord(targets)) {
    throw new Error('targets precisa ser um objeto quando informado.');
  }
  if (isRecord(targets)) {
    for (const field of ['estimatedMaintenanceCalories', 'trainingDayCalories', 'restDayCalories', 'proteinGrams', 'carbohydrateGrams', 'fatGrams']) {
      if (targets[field] !== undefined && !isRange(targets[field])) {
        throw new Error(`plan.targets.${field} é inválido.`);
      }
    }
    if (
      targets.minimumCaloriesWithoutProfessional !== undefined &&
      !Number.isFinite(targets.minimumCaloriesWithoutProfessional)
    ) {
      throw new Error('plan.targets.minimumCaloriesWithoutProfessional é inválido.');
    }
  }
  if (
    strategy === 'fixed' &&
    (!isRecord(targets) ||
      !isRange(targets.estimatedMaintenanceCalories) ||
      !isRange(targets.trainingDayCalories) ||
      !isRange(targets.restDayCalories) ||
      !isRange(targets.proteinGrams) ||
      !isRange(targets.carbohydrateGrams) ||
      !isRange(targets.fatGrams))
  ) {
    throw new Error('Planos fixed precisam informar todas as faixas nutricionais.');
  }
  for (const field of ['preferredFoods', 'avoidedFoods']) {
    if (!Array.isArray(preset.profilePatch[field]) || preset.profilePatch[field].some((item) => typeof item !== 'string')) {
      throw new Error(`profilePatch.${field} precisa ser uma lista de textos.`);
    }
  }
  if (strategy === 'fixed' && !isRecord(preset.goals)) {
    throw new Error('Planos fixed precisam informar goals.');
  }
  if (preset.goals !== undefined) {
    validateGoals(preset.goals);
  }

  if (!Array.isArray(preset.meals) || preset.meals.length === 0) {
    throw new Error('O plano precisa ter ao menos uma refeição.');
  }

  const mealIds = new Set();
  for (const [index, meal] of preset.meals.entries()) {
    if (
      !isRecord(meal) ||
      typeof meal.id !== 'string' ||
      !meal.id.trim() ||
      typeof meal.title !== 'string' ||
      typeof meal.time !== 'string' ||
      typeof meal.note !== 'string'
    ) {
      throw new Error(`Refeição ${index + 1} precisa de id, título, horário e nota válidos.`);
    }
    if (mealIds.has(meal.id)) {
      throw new Error(`Id de refeição duplicado: ${meal.id}.`);
    }
    mealIds.add(meal.id);

    if (meal.optional !== undefined && typeof meal.optional !== 'boolean') {
      throw new Error(`${meal.id}.optional precisa ser booleano.`);
    }
    if (meal.appliesTo !== undefined && !['training', 'rest', 'both'].includes(meal.appliesTo)) {
      throw new Error(`${meal.id}.appliesTo precisa ser training, rest ou both.`);
    }
    if (!isStringArray(meal.items)) {
      throw new Error(`${meal.id}.items precisa ser uma lista de textos.`);
    }
    if (meal.options !== undefined && !Array.isArray(meal.options)) {
      throw new Error(`${meal.id}.options precisa ser uma lista.`);
    }
    meal.options?.forEach((option, optionIndex) => validateMealOption(option, meal.id, optionIndex));
    if (meal.options) {
      const optionIds = meal.options.map((option) => option.id);
      if (new Set(optionIds).size !== optionIds.length) {
        throw new Error(`${meal.id}.options possui ids duplicados.`);
      }
    }
    if (meal.items.length === 0 && (!meal.options || meal.options.length === 0)) {
      throw new Error(`${meal.id} precisa ter items ou options.`);
    }
    for (const field of ['calories', 'protein', 'carbs', 'fat']) {
      if (strategy === 'fixed' || meal[field] !== undefined) {
        assertFiniteNumber(meal[field], `${meal.id}.${field}`);
      }
    }
  }

  const totals = strategy === 'fixed' ? {
    calories: sumMeals(preset.meals, 'calories'),
    protein: sumMeals(preset.meals, 'protein'),
    carbs: sumMeals(preset.meals, 'carbs'),
    fat: sumMeals(preset.meals, 'fat'),
  } : null;
  if (totals && totals.calories !== preset.goals.calories) {
    throw new Error(`As refeições somam ${totals.calories} kcal, mas a meta é ${preset.goals.calories} kcal.`);
  }
  if (totals && (totals.protein < targets.proteinGrams.min || totals.protein > targets.proteinGrams.max)) {
    throw new Error('A proteína distribuída nas refeições está fora da faixa do plano.');
  }
  if (totals && (totals.carbs < targets.carbohydrateGrams.min || totals.carbs > targets.carbohydrateGrams.max)) {
    throw new Error('O carboidrato distribuído nas refeições está fora da faixa do plano.');
  }
  if (totals && (totals.fat < targets.fatGrams.min || totals.fat > targets.fatGrams.max)) {
    throw new Error('A gordura distribuída nas refeições está fora da faixa do plano.');
  }

  return { strategy, mealCount: preset.meals.length, totals };
}

export function applyAssignedNutritionPreset(currentData, preset, assignedAt = new Date().toISOString()) {
  validateAssignedNutritionPreset(preset);
  if (!isRecord(currentData)) {
    throw new Error('A conta ainda não possui dados válidos do aplicativo; aplicação cancelada para não criar um registro parcial.');
  }

  const profile = isRecord(currentData.profile) ? currentData.profile : {};
  const goals = isRecord(currentData.goals) ? currentData.goals : {};
  const nextGoals = preset.goals === undefined ? goals : { ...goals, ...structuredClone(preset.goals) };
  validateGoals(
    nextGoals,
    preset.goals === undefined ? 'goals preservados do AppData' : 'goals finais do plano',
  );

  return {
    ...currentData,
    profile: {
      ...profile,
      preferredFoods: structuredClone(preset.profilePatch.preferredFoods),
      avoidedFoods: structuredClone(preset.profilePatch.avoidedFoods),
    },
    goals: nextGoals,
    meals: structuredClone(preset.meals),
    assignedNutritionPlan: {
      ...structuredClone(preset.plan),
      assignedAt,
    },
  };
}
