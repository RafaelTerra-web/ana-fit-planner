import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Exercise } from '../types';
import { findCatalogExercise } from '../utils/exerciseCatalog';
import { getMuscleLabel } from '../utils/workoutVolume';
import { ExerciseArtwork } from './WorkoutArtwork';

export function ExerciseReference({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const template = findCatalogExercise(exercise);
  useEffect(() => {
    ref.current?.showModal();
    const element = ref.current;
    return () => element?.close();
  }, []);
  return createPortal(
    <dialog
      className="exercise-reference"
      ref={ref}
      aria-label={`Referência de ${exercise.name}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <span>REFERÊNCIA VISUAL</span>
        <button type="button" aria-label="Fechar referência do exercício" onClick={onClose}>
          <X size={21} />
        </button>
      </header>
      <ExerciseArtwork exercise={exercise} labelled />
      <div>
        <h2>{template?.name ?? exercise.name}</h2>
        <p>{template?.equipment ?? exercise.equipment ?? 'Exercício personalizado'}</p>
        <div className="editor-muscle-tags">
          {exercise.targets.map((target) => (
            <span key={`${target.muscle}-${target.role}`}>
              {getMuscleLabel(target.muscle)}
              {target.role === 'secondary' ? ' · apoio' : ''}
            </span>
          ))}
        </div>
        {!template && (
          <p>
            Este exercício foi preservado da sua ficha. Escolha um movimento do banco para usar uma referência
            específica.
          </p>
        )}
        {template && template.name !== exercise.name && (
          <p>Imagem de referência: {template.name}. O nome original da sua ficha foi preservado.</p>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
