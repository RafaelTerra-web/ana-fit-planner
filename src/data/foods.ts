import type { EatingStyle, Food, Profile } from '../types';
import { isFoodCompatible } from '../utils/dietCalculator';

type FilterableFood = Food & {
  aliases?: string[];
  styles: EatingStyle[];
};

const allStyles: EatingStyle[] = ['omnivore', 'flexitarian', 'vegetarian', 'vegan', 'pescatarian'];
const eggAndDairyStyles: EatingStyle[] = ['omnivore', 'flexitarian', 'vegetarian', 'pescatarian'];
const fishStyles: EatingStyle[] = ['omnivore', 'flexitarian', 'pescatarian'];
const meatStyles: EatingStyle[] = ['omnivore', 'flexitarian'];

export const foods: FilterableFood[] = [
  { name: 'Frango', group: 'proteins', aliases: ['carne', 'ave'], styles: meatStyles },
  { name: 'Carne bovina magra', group: 'proteins', aliases: ['carne', 'bovina'], styles: meatStyles },
  { name: 'Peixe', group: 'proteins', aliases: ['atum', 'salmão', 'pescado'], styles: fishStyles },
  { name: 'Ovos', group: 'proteins', aliases: ['ovo'], styles: eggAndDairyStyles },
  {
    name: 'Iogurte natural',
    group: 'proteins',
    aliases: ['leite', 'lactose', 'laticínio', 'laticínios'],
    styles: eggAndDairyStyles,
  },
  { name: 'Tofu', group: 'proteins', aliases: ['soja'], styles: allStyles },
  { name: 'Proteína de soja', group: 'proteins', aliases: ['soja', 'proteína vegetal'], styles: allStyles },
  { name: 'Lentilha', group: 'proteins', aliases: ['leguminosa'], styles: allStyles },
  { name: 'Feijão', group: 'proteins', aliases: ['leguminosa'], styles: allStyles },
  { name: 'Grão-de-bico', group: 'proteins', aliases: ['leguminosa'], styles: allStyles },
  { name: 'Arroz', group: 'carbs', styles: allStyles },
  { name: 'Batata', group: 'carbs', aliases: ['batata inglesa', 'batata-doce'], styles: allStyles },
  { name: 'Aveia', group: 'carbs', aliases: ['glúten'], styles: allStyles },
  { name: 'Tapioca', group: 'carbs', styles: allStyles },
  {
    name: 'Pão integral sem ingredientes de origem animal',
    group: 'carbs',
    aliases: ['pão', 'trigo', 'glúten'],
    styles: allStyles,
  },
  { name: 'Fruta da preferência', group: 'carbs', aliases: ['fruta', 'banana', 'maçã'], styles: allStyles },
  { name: 'Azeite', group: 'fats', styles: allStyles },
  { name: 'Abacate', group: 'fats', styles: allStyles },
  { name: 'Tahine', group: 'fats', aliases: ['gergelim', 'semente'], styles: allStyles },
  { name: 'Castanhas', group: 'fats', aliases: ['oleaginosa', 'nozes'], styles: allStyles },
  { name: 'Pasta de amendoim', group: 'fats', aliases: ['amendoim', 'oleaginosa'], styles: allStyles },
];

export function getFoodsForProfile(profile: Profile): Food[] {
  return foods
    .filter((food) => isFoodCompatible(food.name, profile, food.aliases, food.styles))
    .map((food) => ({ name: food.name, group: food.group, ...(food.note ? { note: food.note } : {}) }));
}
