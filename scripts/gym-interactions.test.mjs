import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, useState } from 'react';
import { createServer } from 'vite';

test('gym flows protect completed sets, navigate active sessions, preserve themes and release wake locks', async () => {
  const dom = new JSDOM(
    '<!doctype html><html data-theme="dark"><head><meta name="theme-color"></head><body><div id="gym-root"></div></body></html>',
    { url: 'http://localhost/', pretendToBeVisual: true },
  );
  const globalKeys = ['window', 'document', 'navigator', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT'];
  const previous = new Map(globalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  }))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  dom.window.HTMLElement.prototype.scrollIntoView = function () {};
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  dom.window.requestAnimationFrame = (callback) => {
    callback(0);
    return 1;
  };
  dom.window.cancelAnimationFrame = () => {};
  dom.window.scrollTo = () => {};
  dom.window.confirm = () => true;
  Object.defineProperty(dom.window.document, 'visibilityState', { configurable: true, value: 'visible' });
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'error',
    optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { RestTimerContext } = await server.ssrLoadModule('/src/hooks/useRestTimer.ts');
    const { AuthContext } = await server.ssrLoadModule('/src/auth/authContext.ts');
    const { ExerciseCard } = await server.ssrLoadModule('/src/components/ExerciseCard.tsx');
    const { Workout } = await server.ssrLoadModule('/src/pages/Workout.tsx');
    const { useScreenAwake } = await server.ssrLoadModule('/src/hooks/useScreenAwake.ts');
    const { createWorkoutSession, getLocalDateKey } = await server.ssrLoadModule('/src/utils/workoutSessions.ts');
    const { defaultProfile, defaultGoals, defaultMeals } = await server.ssrLoadModule('/src/data/dietPlan.ts');
    const { createDefaultWorkouts, createDefaultWeekPlan } = await server.ssrLoadModule('/src/utils/workoutVolume.ts');
    const { createInitialRankState } = await server.ssrLoadModule('/src/utils/ranks.ts');
    const { createDefaultNotificationSettings } = await server.ssrLoadModule('/src/utils/notifications.ts');
    root = createRoot(dom.window.document.getElementById('gym-root'));
    const document = dom.window.document;
    const click = async (element) => {
      assert.ok(element, 'click target exists');
      await act(async () => element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    };
    const button = (text) =>
      [...document.querySelectorAll('button')].find((element) => element.textContent.includes(text));
    const byLabel = (label) =>
      [...document.querySelectorAll('[aria-label]')].find((element) => element.getAttribute('aria-label') === label);
    const starts = [];
    let skips = 0;
    const rest = {
      timer: null,
      remainingSeconds: 0,
      startRest: (details) => {
        starts.push(details);
        rest.timer = details;
      },
      adjustRest: () => {},
      skipRest: () => {
        skips += 1;
        rest.timer = null;
      },
    };
    const auth = {
      user: null,
      displayName: null,
      cloudEnabled: false,
      migrationResult: 'empty',
      forgetAfterDays: null,
      setForgetAfterDays: () => {},
      signOut: async () => {},
      markOnboardingComplete: async (data) => data,
    };
    const wrapped = (child) =>
      createElement(
        AuthContext.Provider,
        { value: auth },
        createElement(RestTimerContext.Provider, { value: rest }, child),
      );
    const exercise = {
      id: 'test-squat',
      name: 'Agachamento',
      sets: 2,
      reps: '8 a 12 reps',
      rest: '90 s',
      targets: [{ muscle: 'quadriceps', role: 'primary' }],
      progressionType: 'large',
    };
    const set = (id, weight = '', reps = '', completed = false) => ({ id, weight, reps, completed, rir: '' });
    const log = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      plannedSetCount: 2,
      targetReps: exercise.reps,
      note: '',
      sets: [set('first'), set('second')],
    };
    const previousLog = { ...log, sets: [set('past1', '42,5', '10', true), set('past2', '40', '9', true)] };
    let currentLog;
    let writes = 0;
    function CardProbe() {
      const [value, update] = useState(log);
      currentLog = value;
      return createElement(ExerciseCard, {
        exercise,
        log: value,
        previousLog,
        defaultExpanded: true,
        onChange: (_id, next) => {
          writes += 1;
          update(next);
        },
      });
    }
    await act(async () => root.render(wrapped(createElement(CardProbe))));
    await click(button('Preencher séries vazias'));
    assert.equal(currentLog.sets[0].weight, '42,5');
    assert.equal(currentLog.sets[1].reps, '9');
    await click(byLabel('Aumentar carga em 2.5 kg na série 1'));
    assert.equal(currentLog.sets[0].weight, '45');
    const complete = byLabel('Concluir série 1');
    await act(async () => {
      complete.click();
      complete.click();
    });
    assert.equal(starts.length, 1, 'double tap starts rest once');
    assert.equal(currentLog.sets[0].completed, true);
    assert.equal(byLabel('Série 1 concluída').disabled, true);
    assert.equal(byLabel('Carga da série 1 em quilos').readOnly, true);
    assert.equal(starts[0].setId, 'first');
    await click(byLabel('Corrigir série 1'));
    assert.equal(currentLog.sets[0].completed, false);
    assert.equal(skips, 1, 'correcting the series cancels its matching rest');
    await click(button('Sem carga externa'));
    assert.equal(currentLog.sets[0].weight, '0');
    await click(byLabel('Concluir série 1'));
    assert.equal(starts.length, 2);
    assert.ok(writes >= 5);
    await act(async () =>
      byLabel('Repetições da série 2').dispatchEvent(
        new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      ),
    );
    assert.equal(currentLog.sets[1].completed, true, 'Done on the repetition keyboard records the series');
    process.stdout.write('✓ quick load controls, history fill, bodyweight, double tap and correction\n');

    const workouts = createDefaultWorkouts();
    const session = createWorkoutSession(workouts[0]);
    const fixture = {
      schemaVersion: 5,
      profile: defaultProfile,
      goals: defaultGoals,
      meals: defaultMeals,
      workouts,
      weekPlan: createDefaultWeekPlan(),
      notifications: createDefaultNotificationSettings(),
      dailyChecks: {},
      exerciseLogs: {},
      workoutSessions: {},
      activeWorkoutSessionId: null,
      rank: createInitialRankState(),
      progressEntries: [],
    };
    let currentData;
    let finishes = 0;
    function WorkoutProbe() {
      const [data, update] = useState(fixture);
      currentData = data;
      return createElement(Workout, {
        data,
        dateKey: getLocalDateKey(),
        todayPlan: { ...fixture.weekPlan[0], activityType: 'workout', workoutId: workouts[0].id },
        todayChecks: { meals: {} },
        onStartSession: () =>
          update((before) => ({
            ...before,
            workoutSessions: { [session.id]: session },
            activeWorkoutSessionId: session.id,
          })),
        onExerciseLogChange: (_sessionId, _workoutId, exerciseId, nextLog) =>
          update((before) => ({
            ...before,
            workoutSessions: {
              ...before.workoutSessions,
              [session.id]: {
                ...before.workoutSessions[session.id],
                exerciseLogs: { ...before.workoutSessions[session.id].exerciseLogs, [exerciseId]: nextLog },
              },
            },
          })),
        onFinishSession: () => {
          finishes += 1;
        },
        onToggleCheck: () => {},
      });
    }
    await act(async () => root.render(wrapped(createElement(WorkoutProbe))));
    // Preview searching must not leave an invisible filter after the training mode starts.
    const search = byLabel('Buscar exercício neste treino');
    if (search) {
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
        setter.call(search, 'hip');
        search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
      assert.ok(
        document.querySelectorAll('.af-exercise').length < workouts[0].exercises.length,
        'preview search actually filters exercises before starting',
      );
    }
    await click(button('Começar treino'));
    assert.ok(document.querySelector('.is-gym-focus'));
    assert.equal(document.querySelector('.gym-planning').hidden, true);
    assert.equal(document.querySelectorAll('.af-exercise').length, workouts[0].exercises.length);
    assert.equal(byLabel('Ir para exercício da sessão').options.length, workouts[0].exercises.length);
    const logEntry = session.exerciseLogs[session.exerciseOrder[0]];
    const repeat = byLabel('Aumentar carga em 2.5 kg na série 1');
    await click(repeat);
    await click(byLabel('Aumentar repetições na série 1'));
    await click(byLabel('Concluir série 1'));
    assert.equal(currentData.workoutSessions[session.id].exerciseLogs[logEntry.exerciseId].sets[0].completed, true);
    const firstSeries = byLabel('Concluir série 2');
    assert.ok(firstSeries, 'next series remains expanded for recording');
    const beforeNext = document.querySelector('.af-exercise-heading[aria-expanded="true"]');
    const selector = byLabel('Ir para exercício da sessão');
    await act(async () => {
      selector.value = workouts[0].exercises[1].id;
      selector.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    });
    assert.notEqual(document.querySelector('.af-exercise-heading[aria-expanded="true"]'), beforeNext);
    await click(button('Ver rotinas'));
    assert.equal(document.querySelector('.gym-planning').hidden, false);
    await click(button('Voltar ao modo academia'));
    await click(button('Finalizar'));
    const finish = button('Finalizar e salvar');
    await act(async () => {
      finish.click();
      finish.click();
    });
    assert.equal(finishes, 1, 'finish is protected against repeated taps');
    assert.ok(skips >= 2, 'finalization stops rest');
    process.stdout.write('✓ focused session, visible exercise navigation, filter reset and finish review\n');

    const wakeRequests = [];
    const locks = [];
    const makeLock = () => {
      const lock = new dom.window.EventTarget();
      lock.released = false;
      lock.release = async () => {
        lock.released = true;
      };
      locks.push(lock);
      return lock;
    };
    Object.defineProperty(dom.window.navigator, 'wakeLock', {
      configurable: true,
      value: { request: () => new Promise((resolve) => wakeRequests.push(resolve)) },
    });
    let status;
    function AwakeProbe({ enabled }) {
      status = useScreenAwake(enabled);
      return null;
    }
    await act(async () => root.render(createElement(AwakeProbe, { enabled: true })));
    const oldLock = makeLock();
    await act(async () => wakeRequests.shift()(oldLock));
    assert.equal(status, 'on');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await act(async () => document.dispatchEvent(new dom.window.Event('visibilitychange')));
    assert.equal(oldLock.released, true);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => document.dispatchEvent(new dom.window.Event('visibilitychange')));
    const newLock = makeLock();
    await act(async () => wakeRequests.shift()(newLock));
    await act(async () => oldLock.dispatchEvent(new dom.window.Event('release')));
    assert.equal(status, 'on', 'late release of old sentinel does not overwrite the new lock');
    await act(async () => root.render(createElement(AwakeProbe, { enabled: false })));
    assert.equal(status, 'off');
    assert.equal(newLock.released, true);
    Object.defineProperty(dom.window.navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          throw new Error('Low battery');
        },
      },
    });
    await act(async () => root.render(createElement(AwakeProbe, { enabled: true })));
    assert.equal(status, 'unavailable', 'denied wake lock is handled without disrupting the workout');
    process.stdout.write('✓ screen awake reacquires on return and releases on exit\n');

    const { default: App } = await server.ssrLoadModule('/src/App.tsx');
    const storedKey = 'ana-fit-planner:data:v5';
    const legacyData = {
      ...fixture,
      profile: { ...fixture.profile, theme: 'light', uiTheme: undefined },
      mealPortionOverrides: { test: [{ itemId: '0', label: 'Teste', quantity: 2, unit: 'g' }] },
    };
    dom.window.localStorage.setItem(storedKey, JSON.stringify(legacyData));
    dom.window.history.replaceState({}, '', '/?tab=settings');
    await act(async () => root.render(wrapped(createElement(App))));
    assert.equal(document.documentElement.dataset.theme, 'dark');
    await click(button('Claro'));
    assert.equal(document.documentElement.dataset.theme, 'light');
    const afterLight = JSON.parse(dom.window.localStorage.getItem(storedKey));
    assert.deepEqual(
      afterLight.mealPortionOverrides,
      legacyData.mealPortionOverrides,
      'theme choice does not alter portion overrides',
    );
    assert.deepEqual(afterLight.meals, legacyData.meals, 'theme choice does not regenerate nutrition');
    await act(async () => root.render(wrapped(createElement(App, { key: 'reload' }))));
    assert.equal(document.documentElement.dataset.theme, 'light', 'explicit light choice survives reload');
    await click(button('Escuro'));
    assert.equal(document.documentElement.dataset.theme, 'dark');
    await click(document.querySelector('[data-testid="nav-workout"]'));
    const secondCard = document.querySelectorAll('.af-exercise')[1];
    await click(secondCard.querySelector('.af-exercise-heading'));
    await click(
      [...secondCard.querySelectorAll('button')].find((element) =>
        element.getAttribute('aria-label')?.startsWith('Aumentar carga'),
      ),
    );
    assert.ok(document.querySelector('.is-gym-focus'), 'editing a series also starts the focused session');
    assert.equal(
      document.querySelector('.af-exercise-heading[aria-expanded="true"]').closest('article').id,
      secondCard.id,
      'implicit start keeps the edited exercise open',
    );
    process.stdout.write('✓ legacy light migrates to dark; explicit preference persists and preserves nutrition\n');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
