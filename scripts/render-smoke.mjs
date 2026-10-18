// Server render smoke checks exercise the real page tree without a browser or cloud account.
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const stored = new Map();
globalThis.window = {
  location: new URL('http://localhost/'),
  localStorage: {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: (key) => stored.delete(key),
  },
};
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const { default: App } = await server.ssrLoadModule('/src/App.tsx');
  const { AuthContext } = await server.ssrLoadModule('/src/auth/authContext.ts');
  const { RestTimerContext } = await server.ssrLoadModule('/src/hooks/useRestTimer.ts');
  const auth = {
    user: null,
    displayName: null,
    cloudEnabled: false,
    migrationResult: 'empty',
    forgetAfterDays: null,
    setForgetAfterDays: () => {},
    signOut: async () => {},
    markOnboardingComplete: async (value) => value,
  };
  const rest = {
    timer: null,
    remainingSeconds: 0,
    startRest: () => {},
    skipRest: () => {},
  };
  const render = (tab) => {
    globalThis.window.location = new URL(`http://localhost/?tab=${tab}`);
    return renderToString(
      createElement(
        AuthContext.Provider,
        { value: auth },
        createElement(RestTimerContext.Provider, { value: rest }, createElement(App)),
      ),
    );
  };
  for (const [tab, expected] of [
    ['today', 'Sua semana'],
    ['workout', 'Meus treinos'],
    ['diet', 'Refeições'],
    ['progress', 'Histórico de treinos'],
    ['settings', 'Backup completo'],
  ]) {
    const html = render(tab);
    assert.ok(html.includes(expected), `${tab} rendered its primary content`);
    assert.equal((html.match(/data-testid="nav-/g) ?? []).length, 5);
    assert.ok(!html.includes('NaN'));
    process.stdout.write(`✓ ${tab}: complete page tree renders\n`);
  }
  const { defaultProfile, defaultGoals, defaultMeals } = await server.ssrLoadModule('/src/data/dietPlan.ts');
  const { createDefaultWorkouts, createDefaultWeekPlan } = await server.ssrLoadModule('/src/utils/workoutVolume.ts');
  const { createWorkoutSession, getLocalDateKey } = await server.ssrLoadModule('/src/utils/workoutSessions.ts');
  const { createInitialRankState } = await server.ssrLoadModule('/src/utils/ranks.ts');
  const { createDefaultNotificationSettings } = await server.ssrLoadModule('/src/utils/notifications.ts');
  const workouts = createDefaultWorkouts();
  const session = createWorkoutSession(workouts[0]);
  const firstLog = session.exerciseLogs[session.exerciseOrder[0]];
  firstLog.sets[0] = {
    ...firstLog.sets[0],
    weight: '42,5',
    reps: '10',
    completed: true,
  };
  const fixture = {
    schemaVersion: 5,
    profile: defaultProfile,
    goals: defaultGoals,
    meals: defaultMeals,
    notifications: createDefaultNotificationSettings(),
    workouts,
    weekPlan: createDefaultWeekPlan(),
    dailyChecks: {},
    exerciseLogs: {},
    workoutSessions: { [session.id]: session },
    activeWorkoutSessionId: session.id,
    rank: createInitialRankState(),
    progressEntries: [],
    cardioEntries: [
      {
        id: 'test-cardio',
        date: getLocalDateKey(),
        activity: 'walk',
        durationMinutes: 30,
        distanceKm: 3,
      },
    ],
  };
  stored.set('ana-fit-planner:data:v5', JSON.stringify(fixture));
  assert.ok(render('workout').includes('42,5'));
  assert.ok(render('today').includes('Seu treino está em andamento'));
  session.completedAt = new Date().toISOString();
  fixture.activeWorkoutSessionId = null;
  stored.set('ana-fit-planner:data:v5', JSON.stringify(fixture));
  const history = render('progress');
  assert.ok(history.includes('425'));
  assert.ok(history.includes('Cardio') || history.includes('cardio'));
  process.stdout.write('✓ active session and completed history survive normalization\n');
  const { csvCell, createWorkoutCsv } = await server.ssrLoadModule('/src/utils/exportData.ts');
  assert.equal(csvCell('=SUM(A1)'), '"\'=SUM(A1)"');
  assert.equal(csvCell('Um "teste"'), '"Um ""teste"""');
  assert.ok(createWorkoutCsv(fixture).includes('42,5'));
  process.stdout.write('✓ CSV exports actual values and protects spreadsheet formulas\n');
} finally {
  await server.close();
}
