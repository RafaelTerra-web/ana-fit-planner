import { Dumbbell } from 'lucide-react';
import { useState } from 'react';
import type { Exercise, MuscleGroup, Workout } from '../types';
import { findCatalogExercise, focusLabels, getWorkoutFocus } from '../utils/exerciseCatalog';
import { getMuscleLabel } from '../utils/workoutVolume';
import '../workout-editor.css';

const assets = import.meta.glob<string>('../assets/workouts/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});
const muscleTiles: Record<MuscleGroup, number> = {
  glutes: 0,
  quadriceps: 1,
  hamstrings: 2,
  back: 3,
  chest: 4,
  shoulders: 5,
  arms: 6,
  core: 7,
  calves: 8,
};

function AtlasTile({
  src,
  index,
  columns = 3,
  rows = 2,
  label,
  className = '',
}: {
  src?: string;
  index: number;
  columns?: number;
  rows?: number;
  label?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState<string>();
  const column = index % columns;
  const row = Math.floor(index / columns);
  return (
    <span
      className={`workout-art ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={!label}
    >
      {src && failed !== src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(src)}
          style={{
            width: `${columns * 100}%`,
            height: `${rows * 100}%`,
            left: `${-column * 100}%`,
            top: `${-row * 100}%`,
          }}
        />
      ) : (
        <Dumbbell size={28} aria-hidden="true" />
      )}
    </span>
  );
}

export function ExerciseArtwork({
  exercise,
  labelled = false,
}: {
  exercise: Pick<Exercise, 'name' | 'catalogId'>;
  labelled?: boolean;
}) {
  const template = findCatalogExercise(exercise);
  const sheet = template ? Math.floor(template.imageIndex / 6) + 1 : 0;
  return (
    <AtlasTile
      src={assets[`../assets/workouts/exercises-${sheet}.webp`]}
      index={template ? template.imageIndex % 6 : 0}
      label={labelled ? `Referência visual de ${template?.name ?? exercise.name}` : undefined}
      className="exercise-art"
    />
  );
}

export function MuscleArtwork({ muscle, labelled = false }: { muscle: MuscleGroup; labelled?: boolean }) {
  return (
    <AtlasTile
      src={assets['../assets/workouts/muscle-focus.webp']}
      index={muscleTiles[muscle]}
      rows={3}
      label={labelled ? getMuscleLabel(muscle) : undefined}
      className="muscle-art"
    />
  );
}

export function WorkoutArtwork({
  workout,
  compact = false,
}: {
  workout: Pick<Workout, 'exercises'>;
  compact?: boolean;
}) {
  const { muscle, group } = getWorkoutFocus(workout);
  if (!workout.exercises.length)
    return (
      <span className="workout-focus-art is-empty">
        <Dumbbell size={35} aria-hidden="true" />
        <span>
          <small>UM MOVIMENTO DE CADA VEZ</small>
          <strong>Monte sua ficha</strong>
          <span>Escolha os exercícios para começar</span>
        </span>
      </span>
    );
  return (
    <span className={`workout-focus-art ${compact ? 'is-compact' : ''}`}>
      <MuscleArtwork muscle={muscle} />
      <span>
        <small>FOCO DO TREINO</small>
        <strong>{focusLabels[group]}</strong>
        <span>{getMuscleLabel(muscle)}</span>
      </span>
    </span>
  );
}
