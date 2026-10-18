import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrainingInsights, getValidTrainingSet, getSessionTrainingSummary } from '../src/utils/trainingInsights.ts';
import { isValidLocalDate, normalizeCardioEntries } from '../src/utils/cardio.ts';
import { validateSetCompletion } from '../src/utils/workoutExperience.ts';

const set = (weight, reps = '10', completed = true) => ({
  id: `${weight}-${reps}`,
  weight,
  reps,
  completed,
  rir: '',
});
const session = (dateKey, weight = '10', overrides = {}) => ({
  id: dateKey,
  dateKey,
  workoutId: 'a',
  workoutTitle: 'A',
  startedAt: `${dateKey}T12:00:00Z`,
  completedAt: `${dateKey}T12:30:00Z`,
  exerciseOrder: ['squat'],
  plannedSetCount: 1,
  exerciseLogs: {
    squat: {
      exerciseId: 'squat',
      exerciseName: 'Agachamento',
      plannedSetCount: 1,
      targetReps: '10',
      note: '',
      sets: [set(weight)],
    },
  },
  ...overrides,
});
const now = new Date(2026, 9, 18, 23, 59);

test('completed valid sets alone contribute volume; decimal comma and zero external load work', () => {
  assert.deepEqual(getValidTrainingSet(set('42,5')), {
    weightKg: 42.5,
    reps: 10,
    volumeKg: 425,
  });
  assert.equal(getValidTrainingSet(set('0')).volumeKg, 0);
  for (const invalid of [set(''), set('-5'), set('20', '2.5'), set('10', '0'), set('10', '10', false), set('1e5')])
    assert.equal(getValidTrainingSet(invalid), null);
});

test('rolling local calendar periods have inclusive bounds and reject unfinished/future/invalid sessions', () => {
  const dates = ['2026-10-12', '2026-10-18', '2026-10-11', '2026-10-05', '2026-10-19'];
  const sessions = Object.fromEntries(dates.map((date) => [date, session(date)]));
  sessions.active = session('2026-10-15', '100', {
    id: 'active',
    completedAt: undefined,
  });
  sessions.invalid = session('2026-02-30');
  const insights = getTrainingInsights(sessions, { now, days: 7 });
  assert.equal(insights.startDateKey, '2026-10-12');
  assert.equal(insights.endDateKey, '2026-10-18');
  assert.equal(insights.current.completedWorkouts, 2);
  assert.equal(insights.previous.completedWorkouts, 2);
  assert.equal(insights.current.volumeKg, 200);
  assert.equal(insights.dailyActivity.length, 7);
  assert.equal(insights.dailyActivity[0].dateKey, '2026-10-12');
  assert.equal(insights.current.durationMinutes, 60);
});

test('first record establishes a baseline and later higher loads create records, including pre-period history', () => {
  const sessions = {
    a: session('2026-09-01', '10'),
    b: session('2026-10-13', '15'),
    c: session('2026-10-15', '15'),
    d: session('2026-10-17', '12'),
  };
  const result = getTrainingInsights(sessions, { now, days: 7 });
  assert.equal(result.recordCount, 1);
  assert.equal(result.exercises[0].allTimeBestKg, 15);
  assert.equal(result.exercises[0].loadChangeKg, -3);
  assert.equal(result.sessions[2].records[0].previousWeightKg, 10);
});

test('session summary includes extra completed sets and retains notes, missing time stays unknown', () => {
  const value = session('2026-10-18', '10', { startedAt: 'invalid' });
  value.exerciseLogs.squat.sets.push(set('20', '5'), set('bad'));
  value.exerciseLogs.squat.note = 'Amplitude controlada';
  const result = getSessionTrainingSummary(value);
  assert.equal(result.completedSets, 3);
  assert.equal(result.validSets, 2);
  assert.equal(result.volumeKg, 200);
  assert.equal(result.durationMinutes, null);
  assert.equal(result.exercises[0].note, 'Amplitude controlada');
});

test('year and leap-day arithmetic creates consecutive dates without DST artifacts', () => {
  const result = getTrainingInsights({}, { now: new Date(2024, 2, 1, 23, 59), days: 7 });
  assert.equal(result.dailyActivity[5].dateKey, '2024-02-29');
  assert.equal(getTrainingInsights({}, { now, days: 365 }).dailyActivity.length, 365);
});

test('cardio normalizer rejects malformed data, deduplicates IDs and preserves older app compatibility', () => {
  assert.deepEqual(normalizeCardioEntries(undefined), []);
  const base = {
    id: 'a',
    date: '2026-10-18',
    activity: 'walk',
    durationMinutes: 30,
    distanceKm: 3,
  };
  const result = normalizeCardioEntries([
    base,
    { ...base, durationMinutes: 45 },
    { ...base, id: 'bad-date', date: '2026-02-30' },
    { ...base, id: 'bad-time', durationMinutes: -1 },
    { ...base, id: 'proto', activity: '__proto__' },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].durationMinutes, 45);
  assert.equal(isValidLocalDate('2024-02-29'), true);
  assert.equal(isValidLocalDate('2026-02-29'), false);
});

test('finishing a set requires explicit valid load and whole reps; bodyweight uses zero', () => {
  assert.equal(validateSetCompletion(set('42,5')), null);
  assert.equal(validateSetCompletion(set('0')), null);
  for (const invalid of [set(''), set('-5'), set('20', '2.5'), set('10', '0'), set('Infinity')])
    assert.equal(typeof validateSetCompletion(invalid), 'string');
});
