import type { Food } from '../types';

export const foods: Food[] = [
  { name: 'Peito de frango', group: 'proteins' },
  { name: 'Ovo', group: 'proteins' },
  { name: 'Queijo', group: 'proteins' },
  { name: 'Presunto', group: 'proteins', note: 'Usar com moderação por ser processado.' },
  { name: 'Feijão', group: 'proteins', note: 'Apoio proteico, não proteína principal.' },
  { name: 'Arroz', group: 'carbs' },
  { name: 'Batata inglesa', group: 'carbs' },
  { name: 'Pão', group: 'carbs' },
  { name: 'Farofa', group: 'carbs', note: 'Calórica, usar em pequena quantidade.' },
  { name: 'Batata palha', group: 'carbs', note: 'Usar pouco, porque sobe calorias rápido.' },
  { name: 'Banana ou fruta opcional', group: 'carbs', note: 'Opcional, se ela aceitar.' },
  { name: 'Azeite opcional', group: 'fats' },
  { name: 'Queijo', group: 'fats' },
  { name: 'Ovo', group: 'fats' },
];
