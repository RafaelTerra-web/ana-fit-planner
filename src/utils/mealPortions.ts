import type { MealPortion } from '../types';

export const portionUnits = [
  'unidade',
  'g',
  'ml',
  'colher de sopa',
  'fatia',
  'concha',
  'xícara',
  'porção',
] as const;

const leadingPortionPattern = /^(\d+(?:[.,]\d+)?)\s+(colheres? de sopa|conchas?|xícaras?|fatias?|unidades?|ovos?|pães?|copos?|g|ml)\s+(?:de\s+)?(.+)$/i;
const leadingCountPattern = /^(\d+(?:[.,]\d+)?)\s+(.+)$/;

function normalizeQuantity(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeUnit(value: string) {
  const normalized = value.toLocaleLowerCase('pt-BR').trim();
  if (normalized.startsWith('colher')) return 'colher de sopa';
  if (normalized.startsWith('concha')) return 'concha';
  if (normalized.startsWith('xícara')) return 'xícara';
  if (normalized.startsWith('fatia')) return 'fatia';
  if (normalized.startsWith('copo')) return 'ml';
  if (normalized.startsWith('ovo') || normalized.startsWith('pão') || normalized.startsWith('unidade')) return 'unidade';
  return normalized === 'g' || normalized === 'ml' ? normalized : 'unidade';
}

export function getMealPortionKey(mealId: string, optionId?: string) {
  return optionId ? `${mealId}:option:${optionId}` : mealId;
}

export function createMealPortion(item: string, itemIndex: number): MealPortion {
  const trimmed = item.trim();
  const portionMatch = trimmed.match(leadingPortionPattern);
  if (portionMatch) {
    return {
      itemId: String(itemIndex),
      quantity: normalizeQuantity(portionMatch[1]),
      unit: normalizeUnit(portionMatch[2]),
      label: portionMatch[3].trim(),
    };
  }

  const countMatch = trimmed.match(leadingCountPattern);
  if (countMatch) {
    return {
      itemId: String(itemIndex),
      quantity: normalizeQuantity(countMatch[1]),
      unit: 'unidade',
      label: countMatch[2].trim(),
    };
  }

  return { itemId: String(itemIndex), label: trimmed };
}

export function getMealPortions(items: string[], overrides?: MealPortion[]) {
  const overridesById = new Map((overrides ?? []).map((portion) => [portion.itemId, portion]));
  return items.map((item, itemIndex) => {
    const initial = createMealPortion(item, itemIndex);
    const override = overridesById.get(initial.itemId);
    return override ? { ...initial, ...override, itemId: initial.itemId } : initial;
  });
}

export function formatMealPortion(portion: MealPortion, fallback: string) {
  if (!portion.quantity || !portion.unit || !portion.label.trim()) return fallback;
  const quantity = Number.isInteger(portion.quantity) ? portion.quantity.toString() : portion.quantity.toLocaleString('pt-BR');
  const unit = portion.quantity > 1
    ? ({ unidade: 'unidades', 'colher de sopa': 'colheres de sopa', fatia: 'fatias', concha: 'conchas', xícara: 'xícaras' }[portion.unit] ?? portion.unit)
    : portion.unit;
  return `${quantity} ${unit} de ${portion.label.trim()}`;
}

export function isMealPortionChanged(item: string, override?: MealPortion) {
  if (!override) return false;
  const initial = createMealPortion(item, Number(override.itemId));
  return (
    override.label.trim() !== initial.label.trim() ||
    override.quantity !== initial.quantity ||
    (override.unit ?? '') !== (initial.unit ?? '')
  );
}

export function hasPortionChanges(items: string[], overrides?: MealPortion[]) {
  if (!overrides?.length) return false;
  return overrides.some((override) => {
    const itemIndex = Number(override.itemId);
    return Number.isInteger(itemIndex) && itemIndex >= 0 && itemIndex < items.length && isMealPortionChanged(items[itemIndex], override);
  });
}
