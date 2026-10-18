import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSessionDuration,
  getRepeatSetReference,
  getSessionElapsedSeconds,
  getSessionVolume,
  normalizeWorkoutSearch,
  parseRestSeconds,
} from '../src/utils/workoutExperience.ts';

const set = (weight = '', reps = '', completed = false) => ({
  id: weight,
  weight,
  reps,
  rir: '',
  completed,
});
const log = (sets) => ({
  exerciseId: 'squat',
  exerciseName: 'Agachamento',
  targetReps: '8 a 12',
  plannedSetCount: sets.length,
  sets,
  note: '',
});

test('repeat skips empty rows and falls back to history without copying completion', () => {
  const current = log([set(), set()]);
  const previous = log([set('42,5', '10', true), set('45', '8', true)]);
  assert.equal(getRepeatSetReference(current, 1, previous), previous.sets[1]);
  current.sets[0] = set('50', '9', true);
  assert.equal(getRepeatSetReference(current, 1, previous), current.sets[0]);
  assert.equal(getRepeatSetReference(log([set()]), 0), undefined);
});

test('rest prescriptions accept ranges, fractional minutes, clock and mixed units', () => {
  assert.equal(parseRestSeconds('2 a 3 min'), 120);
  assert.equal(parseRestSeconds('60 a 90 s'), 60);
  assert.equal(parseRestSeconds('1 min 30 s'), 90);
  assert.equal(parseRestSeconds('1,5 min'), 90);
  assert.equal(parseRestSeconds('01:30'), 90);
  assert.equal(parseRestSeconds('sem descanso'), 0);
});

test('duration freezes at completion and recovers safely from invalid/future timestamps', () => {
  const startedAt = '2026-10-18T12:00:00Z';
  assert.equal(getSessionElapsedSeconds({ startedAt, completedAt: '2026-10-18T12:05:35Z' }, 0), 335);
  assert.equal(getSessionElapsedSeconds({ startedAt }, Date.parse('2026-10-18T11:00:00Z')), 0);
  assert.equal(getSessionElapsedSeconds({ startedAt: 'invalid' }), 0);
  assert.equal(formatSessionDuration(335), '05:35');
  assert.equal(formatSessionDuration(3700), '1:01:40');
});

test('volume uses completed, numeric rows including extras and accepts decimal commas', () => {
  const session = {
    exerciseOrder: ['squat'],
    exerciseLogs: {
      squat: log([
        set('42,5', '10', true),
        set('50', '10', false),
        set('0', '20', true),
        set('bad', '10', true),
        set('10', '5', true),
      ]),
    },
  };
  assert.equal(getSessionVolume(session), 475);
});

test('search finds accented exercise and muscle names', () => {
  assert.equal(normalizeWorkoutSearch('  Glúteos e Bíceps  '), 'gluteos e biceps');
});
