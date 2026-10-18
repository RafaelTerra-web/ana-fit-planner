import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Dumbbell,
  HeartPulse,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';
import type { CardioEntry, WorkoutSession } from '../types';
import { getTrainingInsights, type ExerciseTrainingInsight, type TrainingPeriod } from '../utils/trainingInsights';
import './training-insights.css';

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const shortDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
const longDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

function timeLabel(minutes: number) {
  const rounded = Math.round(minutes);
  return rounded >= 60 ? `${Math.floor(rounded / 60)}h ${String(rounded % 60).padStart(2, '0')}min` : `${rounded} min`;
}

function LoadChart({ exercise }: { exercise: ExerciseTrainingInsight }) {
  const points = exercise.history;
  if (points.length < 2) {
    return (
      <div className="training-chart-empty">
        <TrendingUp size={26} aria-hidden="true" />
        <p>O primeiro ponto está salvo.</p>
        <span>Registre este exercício em outro treino para comparar a carga.</span>
      </div>
    );
  }
  const min = Math.min(...points.map((point) => point.bestWeightKg));
  const max = Math.max(...points.map((point) => point.bestWeightKg));
  const range = max - min || 1;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: 12 + (index / (points.length - 1)) * 296,
    y: 118 - ((point.bestWeightKg - min) / range) * 88,
  }));
  const path = coordinates.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  return (
    <div className="training-load-chart">
      <svg
        viewBox="0 0 320 140"
        role="img"
        aria-label={`Maior carga por sessão de ${exercise.exerciseName}: de ${number.format(points[0].bestWeightKg)} para ${number.format(points[points.length - 1].bestWeightKg)} kg, em ${points.length} sessões.`}
      >
        {[30, 74, 118].map((y) => (
          <line x1="12" x2="308" y1={y} y2={y} key={y} className="training-chart-grid" />
        ))}
        <path d={`${path} L 308 138 L 12 138 Z`} fill="rgba(17, 156, 136, 0.07)" />
        <path d={path} fill="none" stroke="#119c88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((point) => (
          <circle cx={point.x} cy={point.y} r="4" fill="white" stroke="#119c88" strokeWidth="2.5" key={point.sessionId}>
            <title>
              {shortDate(point.dateKey)}: {number.format(point.bestWeightKg)} kg × {point.bestWeightReps}
            </title>
          </circle>
        ))}
      </svg>
      <div className="training-chart-labels">
        <span>{shortDate(points[0].dateKey)}</span>
        <span>{shortDate(points[points.length - 1].dateKey)}</span>
      </div>
    </div>
  );
}

export function TrainingInsights({
  sessions,
  cardioEntries = [],
}: {
  sessions: Record<string, WorkoutSession>;
  cardioEntries?: CardioEntry[];
}) {
  const [days, setDays] = useState<TrainingPeriod>(30);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const insights = getTrainingInsights(sessions, { days });
  const { current, previous } = insights;
  const periodCardio = cardioEntries.filter(
    (entry) => entry.date >= insights.startDateKey && entry.date <= insights.endDateKey,
  );
  const selectedExercise =
    insights.exercises.find((exercise) => exercise.exerciseId === selectedExerciseId) ?? insights.exercises[0];
  const blockSize = days === 7 ? 1 : days === 365 ? 30 : 7;
  const frequency = Array.from({ length: Math.ceil(days / blockSize) }, (_, index) => {
    const group = insights.dailyActivity.slice(index * blockSize, (index + 1) * blockSize);
    return {
      start: group[0].dateKey,
      end: group[group.length - 1].dateKey,
      workouts: group.reduce((total, day) => total + day.workouts, 0),
    };
  });
  const maxFrequency = Math.max(1, ...frequency.map((group) => group.workouts));
  const workoutDifference = current.completedWorkouts - previous.completedWorkouts;

  return (
    <div className="training-insights">
      <section className="training-period-panel" aria-label="Período das estatísticas">
        <div className="training-period-tabs">
          {([7, 30, 90, 365] as const).map((period) => (
            <button
              type="button"
              aria-pressed={days === period}
              className={days === period ? 'is-selected' : ''}
              key={period}
              onClick={() => setDays(period)}
            >
              {period === 365 ? '1 ano' : `${period} dias`}
            </button>
          ))}
        </div>
        <span>
          {shortDate(insights.startDateKey)} — {shortDate(insights.endDateKey)}
        </span>
      </section>

      <div className="training-stat-grid">
        <section className="training-stat training-stat--featured" aria-label="Treinos finalizados">
          <span className="training-stat-icon">
            <Dumbbell size={19} aria-hidden="true" />
          </span>
          <p>Treinos feitos</p>
          <strong>{current.completedWorkouts}</strong>
          <span>
            {current.trainingDays} {current.trainingDays === 1 ? 'dia de treino' : 'dias de treino'}
          </span>
        </section>
        <section className="training-stat" aria-label="Volume de carga registrado">
          <span className="training-stat-icon">
            <TrendingUp size={19} aria-hidden="true" />
          </span>
          <p>Volume total</p>
          <strong>
            {number.format(current.volumeKg)} <small>kg</small>
          </strong>
          <span>{current.validSets} séries com carga e reps</span>
        </section>
        <section className="training-stat" aria-label="Tempo entre início e conclusão das sessões">
          <span className="training-stat-icon">
            <Clock3 size={19} aria-hidden="true" />
          </span>
          <p>Tempo registrado</p>
          <strong className="training-time-value">
            {current.timedWorkouts ? timeLabel(current.durationMinutes) : '—'}
          </strong>
          <span>{current.timedWorkouts ? 'Do início à finalização' : 'Finalize uma sessão para medir'}</span>
        </section>
        <section className="training-stat" aria-label="Novas maiores cargas registradas">
          <span className="training-stat-icon training-stat-icon--gold">
            <Trophy size={19} aria-hidden="true" />
          </span>
          <p>Novos recordes</p>
          <strong>{insights.recordCount}</strong>
          <span>Maior carga que a anterior</span>
        </section>
      </div>

      <section className="training-panel" aria-labelledby="training-frequency-heading">
        <div className="training-panel-heading">
          <div>
            <p className="training-eyebrow">UM TREINO DE CADA VEZ</p>
            <h2 id="training-frequency-heading">Sua constância</h2>
          </div>
          <span className="training-panel-icon">
            <CalendarDays size={20} aria-hidden="true" />
          </span>
        </div>
        {current.completedWorkouts ? (
          <>
            <div
              className="training-frequency-chart"
              role="img"
              aria-label={`Frequência no período: ${frequency.map((group) => `${shortDate(group.start)}${group.start !== group.end ? ` a ${shortDate(group.end)}` : ''}: ${group.workouts} treinos`).join('; ')}`}
            >
              {frequency.map((group) => (
                <div
                  className="training-frequency-column"
                  key={group.start}
                  title={`${shortDate(group.start)} a ${shortDate(group.end)}: ${group.workouts} treinos`}
                >
                  <span>{group.workouts || ''}</span>
                  <div className="training-frequency-track">
                    <i
                      style={{
                        height: `${group.workouts ? Math.max(8, (group.workouts / maxFrequency) * 100) : 4}%`,
                      }}
                      className={group.workouts ? 'has-workout' : ''}
                    />
                  </div>
                  <small>
                    {days === 7
                      ? new Date(`${group.start}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'narrow' })
                      : shortDate(group.start)}
                  </small>
                </div>
              ))}
            </div>
            <p className="training-chart-caption">
              {days === 7
                ? 'Treinos finalizados em cada dia.'
                : `Treinos por bloco de ${blockSize} dias. O último pode ser menor.`}
            </p>
            {previous.completedWorkouts > 0 ? (
              <p className="training-comparison">
                {workoutDifference >= 0 ? (
                  <ArrowUpRight size={16} aria-hidden="true" />
                ) : (
                  <ArrowDownRight size={16} aria-hidden="true" />
                )}
                {workoutDifference === 0
                  ? 'Mesmo número de treinos'
                  : `${Math.abs(workoutDifference)} ${Math.abs(workoutDifference) === 1 ? 'treino' : 'treinos'} a ${workoutDifference > 0 ? 'mais' : 'menos'}`}{' '}
                que nos {days} dias anteriores.
              </p>
            ) : (
              <p className="training-comparison">
                <Check size={16} aria-hidden="true" />
                {current.completedSets} séries marcadas como concluídas neste período.
              </p>
            )}
          </>
        ) : (
          <div className="training-empty">
            <span className="training-empty-icon">
              <Dumbbell size={25} aria-hidden="true" />
            </span>
            <h3>Seu próximo treino já conta.</h3>
            <p>Marque as séries e finalize o treino. Sua frequência, suas cargas e seus recordes aparecem aqui.</p>
          </div>
        )}
      </section>

      <section className="training-panel" aria-labelledby="training-load-heading">
        <div className="training-panel-heading">
          <div>
            <p className="training-eyebrow">VEJA A CARGA EVOLUIR</p>
            <h2 id="training-load-heading">Evolução por exercício</h2>
          </div>
          <TrendingUp size={21} className="training-teal" aria-hidden="true" />
        </div>
        {selectedExercise ? (
          <>
            <label className="training-select-label" htmlFor="training-exercise-select">
              Exercício
            </label>
            <select
              className="training-select"
              id="training-exercise-select"
              value={selectedExercise.exerciseId}
              onChange={(event) => setSelectedExerciseId(event.target.value)}
            >
              {insights.exercises.map((exercise) => (
                <option key={exercise.exerciseId} value={exercise.exerciseId}>
                  {exercise.exerciseName}
                </option>
              ))}
            </select>
            <div className="training-exercise-metrics">
              <div>
                <span>Última maior carga</span>
                <strong>
                  {number.format(selectedExercise.history[selectedExercise.history.length - 1].bestWeightKg)}{' '}
                  <small>kg</small>
                </strong>
              </div>
              <div>
                <span>Seu recorde registrado</span>
                <strong>
                  {number.format(selectedExercise.allTimeBestKg)} <small>kg</small>
                </strong>
              </div>
            </div>
            <LoadChart exercise={selectedExercise} />
            {selectedExercise.loadChangeKg !== null ? (
              <p className="training-load-change">
                {selectedExercise.loadChangeKg > 0 ? '+' : ''}
                {number.format(selectedExercise.loadChangeKg)} kg entre a primeira e a última sessão do período.
              </p>
            ) : null}
            <p className="training-chart-caption">
              Maior carga externa em uma série concluída por sessão. A comparação não considera mudanças na técnica ou
              nas repetições.
            </p>
            <details className="training-history-details">
              <summary>
                Ver os registros <span>{selectedExercise.history.length} sessões</span>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <div className="training-exercise-history">
                {[...selectedExercise.history].reverse().map((point) => (
                  <div key={point.sessionId}>
                    <span>
                      <strong>{shortDate(point.dateKey)}</strong>
                      <small>
                        {point.completedSets} séries · {number.format(point.volumeKg)} kg de volume
                      </small>
                    </span>
                    <b>
                      {number.format(point.bestWeightKg)} kg × {point.bestWeightReps}
                    </b>
                  </div>
                ))}
              </div>
            </details>
          </>
        ) : (
          <div className="training-empty training-empty--compact">
            <TrendingUp size={27} aria-hidden="true" />
            <h3>As cargas contam a sua história.</h3>
            <p>
              Preencha carga e repetições nas séries concluídas. Depois de finalizar, você poderá comparar cada
              exercício aqui.
            </p>
          </div>
        )}
      </section>

      <section className="training-panel" aria-labelledby="training-history-heading">
        <div className="training-panel-heading">
          <div>
            <p className="training-eyebrow">CADA SESSÃO FICA SALVA</p>
            <h2 id="training-history-heading">Histórico de treinos</h2>
          </div>
          <span className="training-count">{insights.sessions.length}</span>
        </div>
        {insights.sessions.length ? (
          <div className="training-session-list">
            {insights.sessions.map((session) => (
              <details className="training-session" key={session.id}>
                <summary>
                  <span className="training-session-icon">
                    <Dumbbell size={18} aria-hidden="true" />
                  </span>
                  <span className="training-session-title">
                    <strong>{session.workoutTitle}</strong>
                    <small>
                      {longDate(session.dateKey)} · {session.completedSets} séries
                    </small>
                  </span>
                  <span className="training-session-volume">
                    {number.format(session.volumeKg)}
                    <small>kg de volume</small>
                  </span>
                  <ChevronDown size={16} className="training-detail-chevron" aria-hidden="true" />
                </summary>
                <div className="training-session-body">
                  <p>
                    {session.durationMinutes !== null
                      ? `${timeLabel(session.durationMinutes)} do início à finalização`
                      : 'Tempo de sessão indisponível'}
                    {session.validSets < session.completedSets
                      ? ` · ${session.completedSets - session.validSets} séries sem carga/repetições válidas`
                      : ''}
                  </p>
                  {session.records.length > 0 ? (
                    <div className="training-record-list">
                      {session.records.map((record) => (
                        <span key={record.exerciseId}>
                          <Trophy size={14} aria-hidden="true" />
                          {record.exerciseName}: {number.format(record.weightKg)} kg{' '}
                          <small>(antes {number.format(record.previousWeightKg)} kg)</small>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {session.exercises.map((exercise) => (
                    <div className="training-session-exercise" key={exercise.exerciseId}>
                      <div>
                        <strong>{exercise.exerciseName}</strong>
                        <small>
                          {exercise.completedSets} séries concluídas
                          {exercise.note ? ` · ${exercise.note}` : ''}
                        </small>
                      </div>
                      <span>
                        {exercise.bestWeightKg !== null
                          ? `${number.format(exercise.bestWeightKg)} kg × ${exercise.bestWeightReps}`
                          : 'Carga não informada'}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="training-history-empty">
            Nenhuma sessão finalizada nestes {days} dias. Os treinos anteriores continuam salvos nos outros períodos.
          </p>
        )}
      </section>
      <section className="training-panel training-cardio-summary">
        <div className="training-panel-heading">
          <div>
            <p className="training-eyebrow">NO SEU RITMO</p>
            <h2>Seu cardio no período</h2>
          </div>
          <HeartPulse size={22} className="training-teal" />
        </div>
        <div className="training-cardio-numbers">
          <span>
            <strong>{periodCardio.length}</strong>atividades
          </span>
          <span>
            <strong>
              {number.format(periodCardio.reduce((total, entry) => total + entry.durationMinutes, 0))}
              <small> min</small>
            </strong>
            em movimento
          </span>
          <span>
            <strong>
              {number.format(periodCardio.reduce((total, entry) => total + (entry.distanceKm ?? 0), 0))}
              <small> km</small>
            </strong>
            com distância informada
          </span>
        </div>
        {!periodCardio.length && (
          <p className="training-chart-caption">Registre uma caminhada, corrida ou outra atividade na aba Treinos.</p>
        )}
      </section>
      <p className="training-data-note">
        Somente sessões finalizadas. Volume = carga × repetições das séries concluídas com valores válidos; exercícios
        sem carga externa podem usar 0 kg. O histórico começa com o que você registrou no app.
      </p>
    </div>
  );
}
