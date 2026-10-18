import { BookOpen, Check, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { exerciseLibrary, type LibraryExercise } from '../data/exerciseLibrary';
import { normalizeWorkoutSearch } from '../utils/workoutExperience';
import { getMuscleLabel, muscleOptions } from '../utils/workoutVolume';

export function ExerciseLibrary({ onAdd }: { onAdd: (exercise: LibraryExercise) => void }) {
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [added, setAdded] = useState('');
  const matches = exerciseLibrary.filter(
    (exercise) =>
      (!muscle || exercise.targets.some((target) => target.muscle === muscle)) &&
      (!equipment || exercise.equipment === equipment) &&
      normalizeWorkoutSearch(
        `${exercise.name} ${exercise.equipment} ${exercise.targets.map((target) => getMuscleLabel(target.muscle)).join(' ')}`,
      ).includes(normalizeWorkoutSearch(search)),
  );
  return (
    <details className="exercise-library">
      <summary>
        <BookOpen size={17} />
        <span>Escolher da biblioteca</span>
        <small>{exerciseLibrary.length} exercícios</small>
      </summary>
      <div className="exercise-library-body">
        <p>Um ponto de partida para a sua ficha. Ajuste séries, repetições e descanso ao seu plano.</p>
        <label className="exercise-library-search">
          <Search size={16} />
          <input
            aria-label="Buscar na biblioteca de exercícios"
            placeholder="Nome, músculo ou equipamento"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="exercise-library-filters">
          <select
            className="input"
            aria-label="Filtrar músculo"
            value={muscle}
            onChange={(event) => setMuscle(event.target.value)}
          >
            <option value="">Todos os músculos</option>
            {muscleOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            className="input"
            aria-label="Filtrar equipamento"
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
          >
            <option value="">Todo equipamento</option>
            {[...new Set(exerciseLibrary.map((exercise) => exercise.equipment))].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="exercise-library-results">
          {matches.map((exercise) => (
            <button
              type="button"
              key={exercise.name}
              onClick={() => {
                onAdd(exercise);
                setAdded(exercise.name);
              }}
            >
              <span>
                <strong>{exercise.name}</strong>
                <small>
                  {getMuscleLabel(exercise.targets[0].muscle)} · {exercise.equipment}
                </small>
              </span>
              <Plus size={17} />
            </button>
          ))}
          {!matches.length && <p>Nenhum resultado. Você também pode criar seu próprio exercício.</p>}
        </div>
        {added && (
          <p className="utility-success" role="status">
            <Check size={15} />
            {added} adicionado ao treino.
          </p>
        )}
      </div>
    </details>
  );
}
