import type { AssignedNutritionPlan } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isPlanList(value: unknown) {
  return Array.isArray(value) && value.every(
    (item) => isRecord(item) && typeof item.id === 'string' && typeof item.title === 'string' && isStringArray(item.items)
  );
}

function isOptionalStringArray(value: unknown) {
  return value === undefined || isStringArray(value);
}

function isRange(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.min === 'number' &&
    Number.isFinite(value.min) &&
    typeof value.max === 'number' &&
    Number.isFinite(value.max)
  );
}

export function normalizeAssignedNutritionPlan(value: unknown): AssignedNutritionPlan | undefined {
  if (!isRecord(value)) return undefined;

  const strategy = value.mealStrategy;
  const targets = value.targets;
  const targetsAreValid =
    targets === undefined ||
    (isRecord(targets) &&
      (targets.estimatedMaintenanceCalories === undefined || isRange(targets.estimatedMaintenanceCalories)) &&
      (targets.trainingDayCalories === undefined || isRange(targets.trainingDayCalories)) &&
      (targets.restDayCalories === undefined || isRange(targets.restDayCalories)) &&
      (targets.proteinGrams === undefined || isRange(targets.proteinGrams)) &&
      (targets.carbohydrateGrams === undefined || isRange(targets.carbohydrateGrams)) &&
      (targets.fatGrams === undefined || isRange(targets.fatGrams)) &&
      (targets.minimumCaloriesWithoutProfessional === undefined ||
        (typeof targets.minimumCaloriesWithoutProfessional === 'number' &&
          Number.isFinite(targets.minimumCaloriesWithoutProfessional))));
  const fixedTargetsAreComplete =
    strategy !== 'fixed' ||
    (isRecord(targets) &&
      isRange(targets.estimatedMaintenanceCalories) &&
      isRange(targets.trainingDayCalories) &&
      isRange(targets.restDayCalories) &&
      isRange(targets.proteinGrams));

  if (
    typeof value.id !== 'string' ||
    typeof value.revision !== 'number' ||
    typeof value.title !== 'string' ||
    typeof value.objective !== 'string' ||
    (strategy !== 'fixed' && strategy !== 'flexible') ||
    (value.mealWeightBasis !== undefined && typeof value.mealWeightBasis !== 'string') ||
    !isOptionalStringArray(value.portionGuidance) ||
    !isRecord(value.context) ||
    !isOptionalStringArray(value.context.avoidedFoods) ||
    !isOptionalStringArray(value.context.notes) ||
    !targetsAreValid ||
    !fixedTargetsAreComplete ||
    !isOptionalStringArray(value.restDayAdjustments) ||
    (value.substitutions !== undefined && !isPlanList(value.substitutions)) ||
    (value.guidance !== undefined && !isPlanList(value.guidance)) ||
    (value.disclaimer !== undefined && typeof value.disclaimer !== 'string') ||
    typeof value.assignedAt !== 'string'
  ) {
    return undefined;
  }

  return value as unknown as AssignedNutritionPlan;
}

export function hasAssignedNutritionPlan(value: unknown) {
  return normalizeAssignedNutritionPlan(value) !== undefined;
}

export function hasFixedAssignedNutritionPlan(value: unknown) {
  return normalizeAssignedNutritionPlan(value)?.mealStrategy === 'fixed';
}
