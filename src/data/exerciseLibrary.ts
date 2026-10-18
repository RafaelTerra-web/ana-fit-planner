import type { Exercise, MuscleGroup } from '../types';

export type LibraryExercise = Omit<Exercise, 'id'> & { equipment: string };
type Entry = [string, MuscleGroup, string, 'large' | 'isolation', MuscleGroup?];
const entries: Entry[] = [
  ['Agachamento livre', 'quadriceps', 'Barra', 'large', 'glutes'],
  ['Agachamento goblet', 'quadriceps', 'Halteres', 'large', 'glutes'],
  ['Agachamento búlgaro', 'quadriceps', 'Halteres', 'large', 'glutes'],
  ['Leg press', 'quadriceps', 'Máquina', 'large', 'glutes'],
  ['Cadeira extensora', 'quadriceps', 'Máquina', 'isolation'],
  ['Passada com halteres', 'quadriceps', 'Halteres', 'large', 'glutes'],
  ['Hip thrust com barra', 'glutes', 'Barra', 'large', 'hamstrings'],
  ['Elevação pélvica', 'glutes', 'Peso corporal', 'large', 'hamstrings'],
  ['Abdução de quadril', 'glutes', 'Máquina', 'isolation'],
  ['Coice na polia', 'glutes', 'Polia', 'isolation'],
  ['Stiff / RDL com barra', 'hamstrings', 'Barra', 'large', 'glutes'],
  ['Stiff com halteres', 'hamstrings', 'Halteres', 'large', 'glutes'],
  ['Mesa flexora', 'hamstrings', 'Máquina', 'isolation'],
  ['Cadeira flexora', 'hamstrings', 'Máquina', 'isolation'],
  ['Levantamento terra', 'hamstrings', 'Barra', 'large', 'back'],
  ['Puxada frontal', 'back', 'Polia', 'large', 'arms'],
  ['Remada baixa', 'back', 'Polia', 'large', 'arms'],
  ['Remada curvada', 'back', 'Barra', 'large', 'arms'],
  ['Remada unilateral', 'back', 'Halteres', 'large', 'arms'],
  ['Barra fixa', 'back', 'Peso corporal', 'large', 'arms'],
  ['Pulldown com braços estendidos', 'back', 'Polia', 'isolation'],
  ['Supino reto com barra', 'chest', 'Barra', 'large', 'arms'],
  ['Supino reto com halteres', 'chest', 'Halteres', 'large', 'arms'],
  ['Supino inclinado', 'chest', 'Halteres', 'large', 'shoulders'],
  ['Crucifixo com halteres', 'chest', 'Halteres', 'isolation'],
  ['Crucifixo na máquina', 'chest', 'Máquina', 'isolation'],
  ['Flexão de braços', 'chest', 'Peso corporal', 'large', 'arms'],
  ['Desenvolvimento com halteres', 'shoulders', 'Halteres', 'large', 'arms'],
  ['Elevação lateral', 'shoulders', 'Halteres', 'isolation'],
  ['Elevação frontal', 'shoulders', 'Halteres', 'isolation'],
  ['Crucifixo inverso', 'shoulders', 'Máquina', 'isolation', 'back'],
  ['Face pull', 'shoulders', 'Polia', 'isolation', 'back'],
  ['Rosca direta', 'arms', 'Barra', 'isolation'],
  ['Rosca alternada', 'arms', 'Halteres', 'isolation'],
  ['Rosca martelo', 'arms', 'Halteres', 'isolation'],
  ['Tríceps na polia', 'arms', 'Polia', 'isolation'],
  ['Tríceps francês', 'arms', 'Halteres', 'isolation'],
  ['Tríceps testa', 'arms', 'Barra', 'isolation'],
  ['Abdominal no solo', 'core', 'Peso corporal', 'isolation'],
  ['Abdominal na polia', 'core', 'Polia', 'isolation'],
  ['Elevação de pernas', 'core', 'Peso corporal', 'isolation'],
  ['Panturrilha em pé', 'calves', 'Máquina', 'isolation'],
  ['Panturrilha sentada', 'calves', 'Máquina', 'isolation'],
  ['Panturrilha unilateral', 'calves', 'Peso corporal', 'isolation'],
];

export const exerciseLibrary: LibraryExercise[] = entries.map(
  ([name, primary, equipment, progressionType, secondary]) => ({
    name,
    equipment,
    progressionType,
    sets: 3,
    reps: '8 a 12 reps',
    rest: '90 s',
    targets: [
      { muscle: primary, role: 'primary' },
      ...(secondary ? [{ muscle: secondary, role: 'secondary' as const }] : []),
    ],
    ...(name.includes('unilateral') || name.includes('búlgaro') || name.includes('Passada')
      ? { unilateral: true }
      : {}),
  }),
);
