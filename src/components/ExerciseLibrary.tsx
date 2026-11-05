import { Check, Plus, Search, X } from 'lucide-react';
import { useState } from 'react';
import { exerciseLibrary, type LibraryExercise } from '../data/exerciseLibrary';
import { normalizeWorkoutSearch } from '../utils/workoutExperience';
import { getMuscleLabel, muscleOptions } from '../utils/workoutVolume';
import { focusLabels, lowerMuscles, type WorkoutFocus } from '../utils/exerciseCatalog';
import { ExerciseArtwork, MuscleArtwork } from './WorkoutArtwork';

export function ExerciseLibrary({
  onAdd,
  onView,
  selected = [],
  initialFocus = 'full',
  replacing = false,
}: {
  onAdd: (exercise: LibraryExercise) => void;
  onView?: (exercise: LibraryExercise) => void;
  selected?: string[];
  initialFocus?: WorkoutFocus;
  replacing?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<WorkoutFocus>(initialFocus);
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [added, setAdded] = useState('');
  const matches = exerciseLibrary.filter((exercise) => {
    const primary = exercise.targets[0].muscle;
    return (
      (muscle
        ? exercise.targets.some((target) => target.muscle === muscle)
        : group === 'full' ||
          (group === 'core'
            ? primary === 'core'
            : group === 'lower'
              ? lowerMuscles.has(primary)
              : !lowerMuscles.has(primary) && primary !== 'core')) &&
      (!equipment || exercise.equipment === equipment) &&
      normalizeWorkoutSearch(
        `${exercise.name} ${exercise.equipment} ${exercise.targets.map((target) => getMuscleLabel(target.muscle)).join(' ')}`,
      ).includes(normalizeWorkoutSearch(search))
    );
  });
  return (
    <section className="visual-library" aria-label="Banco de exercícios">
      <div className="editor-section-heading">
        <div>
          <span className="editor-eyebrow">ESCOLHA O MOVIMENTO</span>
          <h3>Banco de exercícios</h3>
          <p>{exerciseLibrary.length} movimentos prontos. Você ajusta a dose.</p>
        </div>
      </div>
      <div className="editor-focus-tabs" aria-label="Região do corpo">
        {(['full', 'lower', 'upper', 'core'] as const).map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={group === item && !muscle}
            onClick={() => {
              setGroup(item);
              setMuscle('');
            }}
          >
            {item === 'full' ? 'Todos' : focusLabels[item]}
          </button>
        ))}
      </div>
      <label className="editor-search">
        <Search size={18} />
        <input
          aria-label="Buscar na biblioteca de exercícios"
          placeholder="Buscar exercício ou equipamento"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {search && (
          <button type="button" aria-label="Limpar busca de exercícios" onClick={() => setSearch('')}>
            <X size={15} />
          </button>
        )}
      </label>
      <div className="library-muscles" aria-label="Filtrar por músculo">
        {muscleOptions.map((item) => (
          <button
            type="button"
            key={item.value}
            aria-pressed={muscle === item.value}
            onClick={() => setMuscle(muscle === item.value ? '' : item.value)}
          >
            <MuscleArtwork muscle={item.value} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="library-results-heading">
        <span>
          {matches.length} {matches.length === 1 ? 'movimento' : 'movimentos'}
        </span>
        <label>
          <span className="sr-only">Filtrar equipamento</span>
          <select
            aria-label="Filtrar equipamento"
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
          >
            <option value="">Todos os equipamentos</option>
            {[...new Set(exerciseLibrary.map((exercise) => exercise.equipment))].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="visual-library-results">
        {matches.map((exercise) => {
          const included = !replacing && selected.includes(exercise.catalogId);
          return (
            <article key={exercise.catalogId}>
              <button
                className="library-preview"
                type="button"
                aria-label={`Ver execução de ${exercise.name}`}
                onClick={() => onView?.(exercise)}
              >
                <ExerciseArtwork exercise={exercise} />
              </button>
              <div>
                <strong>{exercise.name}</strong>
                <small>
                  {getMuscleLabel(exercise.targets[0].muscle)} · {exercise.equipment}
                </small>
                <span>
                  {exercise.sets} séries · {exercise.reps}
                </span>
                <button
                  className={`library-add ${included ? 'is-added' : ''}`}
                  type="button"
                  disabled={included}
                  onClick={() => {
                    onAdd(exercise);
                    setAdded(exercise.name);
                  }}
                >
                  {included ? <Check size={15} /> : <Plus size={15} />}
                  {included ? 'No treino' : replacing ? 'Escolher este' : 'Adicionar'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!matches.length && (
        <div className="editor-empty">
          <Search size={26} />
          <h3>Nenhum movimento por aqui</h3>
          <p>Tente outro nome ou limpe os filtros.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setMuscle('');
              setEquipment('');
              setGroup('full');
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}
      <p className="sr-only" role="status">
        {added ? `${added} adicionado ao treino.` : ''}
      </p>
    </section>
  );
}
