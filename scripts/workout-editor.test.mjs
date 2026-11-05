import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createServer } from 'vite';

test('visual editor opens without a keyboard, edits prescriptions, selects catalog movements and protects history', async () => {
  const dom = new JSDOM(
    '<!doctype html><html><body><button id="trigger">Open</button><div id="root"></div></body></html>',
    { url: 'http://localhost/', pretendToBeVisual: true },
  );
  const globalValues = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = new Map(
    Object.keys(globalValues).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  for (const [key, value] of Object.entries(globalValues))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  dom.window.requestAnimationFrame = (callback) => {
    callback(0);
    return 1;
  };
  dom.window.cancelAnimationFrame = () => {};
  dom.window.confirm = () => true;
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'error',
    optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { WorkoutPlanManager } = await server.ssrLoadModule('/src/components/WorkoutPlanManager.tsx');
    const { exerciseLibrary } = await server.ssrLoadModule('/src/data/exerciseLibrary.ts');
    const { createDefaultWorkouts, createDefaultWeekPlan, normalizeWorkoutData } = await server.ssrLoadModule(
      '/src/utils/workoutVolume.ts',
    );
    const { createCatalogExercise, findCatalogExercise, normalizePlannedWeight } = await server.ssrLoadModule(
      '/src/utils/exerciseCatalog.ts',
    );
    const { createWorkoutSession } = await server.ssrLoadModule('/src/utils/workoutSessions.ts');
    assert.equal(exerciseLibrary.length, 48);
    assert.equal(new Set(exerciseLibrary.map((exercise) => exercise.catalogId)).size, 48);
    for (const exercise of exerciseLibrary)
      assert.ok(
        existsSync(
          new URL(
            `../src/assets/workouts/exercises-${Math.floor(exercise.imageIndex / 6) + 1}.webp`,
            import.meta.url,
          ),
        ),
      );
    assert.equal(findCatalogExercise({ name: 'Abdominal prancha' }).name, 'Prancha');
    assert.equal(findCatalogExercise({ name: 'Leg press horizontal' }).imageIndex, 47);
    assert.equal(findCatalogExercise({ name: 'Movimento único da ficha pessoal' }), undefined);
    assert.equal(normalizePlannedWeight('2,5'), 2.5);
    assert.equal(normalizePlannedWeight(-1), undefined);
    assert.equal(normalizePlannedWeight(Infinity), undefined);
    const workouts = createDefaultWorkouts();
    for (const workout of workouts)
      for (const exercise of workout.exercises)
        assert.ok(findCatalogExercise(exercise), `${exercise.name} has a specific catalog reference`);
    const fixture = {
      workouts,
      weekPlan: createDefaultWeekPlan(),
      workoutSessions: {},
      activeWorkoutSessionId: null,
    };
    const original = JSON.stringify(fixture);
    let saved;
    let week;
    const props = {
      data: fixture,
      onWorkoutsChange: (value) => {
        saved = value;
      },
      onWeekPlanChange: (value) => {
        week = value;
      },
    };
    root = createRoot(dom.window.document.getElementById('root'));
    const document = dom.window.document;
    const labelled = (label) =>
      [...document.querySelectorAll('[aria-label]')].find(
        (element) => element.getAttribute('aria-label') === label,
      );
    const button = (text) =>
      [...document.querySelectorAll('button')].find((element) => element.textContent.trim() === text);
    const click = async (element) => {
      assert.ok(element, 'the requested control exists');
      await act(async () => element.click());
    };
    const input = async (element, value) => {
      const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
      await act(async () => {
        setter.call(element, value);
        element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
    };
    await act(async () => root.render(createElement(WorkoutPlanManager, props)));
    await click(labelled(`Editar ficha ${workouts[0].title}`));
    assert.equal(
      document.activeElement.tagName,
      'H2',
      'opening focuses a non-editable heading, not the workout name',
    );
    assert.equal(document.querySelector('.editor-metadata').open, false);
    const first = workouts[0].exercises[0];
    await click(labelled(`Aumentar séries de ${first.name}`));
    await click(labelled(`Alterar repetições de ${first.name}`));
    await click(button('12 a 20'));
    await click(labelled(`Aumentar carga planejada de ${first.name}`));
    await click(labelled(`Digitar carga planejada de ${first.name}`));
    await input(labelled(`Carga planejada em kg de ${first.name}`), '7,5');
    await click(button('Adicionar exercícioEscolha no banco visual de movimentos'));
    assert.notEqual(document.activeElement.tagName, 'INPUT', 'the catalog does not summon a keyboard');
    await click(button('Todos'));
    await input(labelled('Buscar na biblioteca de exercícios'), 'Rosca martelo');
    assert.equal(document.querySelectorAll('.visual-library-results article').length, 1);
    await click(button('Adicionar'));
    assert.equal(
      button('No treino').disabled,
      true,
      'a selected catalog movement cannot be accidentally duplicated',
    );
    await click(button('Concluir seleção'));
    assert.equal(saved, undefined, 'concluding selection must never submit or save the workout form');
    assert.ok(
      document.querySelector('[role="dialog"]'),
      'selection returns to the draft for explicit confirmation',
    );
    assert.equal(
      document.activeElement.tagName,
      'H2',
      'returning from selection keeps focus inside the editor without a keyboard',
    );
    await click(button('Salvar treino'));
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(saved[0].exercises[0].sets, first.sets + 1);
    assert.equal(saved[0].exercises[0].reps, '12 a 20 reps');
    assert.equal(saved[0].exercises[0].plannedWeightKg, 7.5);
    assert.equal(saved[0].title, workouts[0].title);
    assert.equal(saved[0].exercises.at(-1).name, 'Rosca martelo');
    assert.ok(saved[0].exercises.at(-1).catalogId);
    assert.equal(JSON.stringify(fixture), original, 'editing a draft never mutates stored plan or history');
    assert.ok(week.every((day) => day.workoutId !== workouts[0].id || day.title === workouts[0].title));
    const session = createWorkoutSession(saved[0]);
    assert.ok(session.exerciseLogs[first.id].sets.every((set) => set.weight === '7.5' && !set.completed));
    const preservedSession = JSON.stringify(session);
    const normalized = normalizeWorkoutData({ workouts: saved, weekPlan: fixture.weekPlan });
    assert.equal(normalized.workouts[0].exercises[0].plannedWeightKg, 7.5);
    assert.equal(JSON.stringify(session), preservedSession);

    await click(labelled(`Editar ficha ${workouts[0].title}`));
    await click(labelled(`Substituir ${first.name}`));
    await click(button('Todos'));
    await input(labelled('Buscar na biblioteca de exercícios'), 'Remada articulada');
    await click(button('Escolher este'));
    await click(button('Salvar treino'));
    assert.notEqual(
      saved[0].exercises[0].id,
      first.id,
      'substitution uses a new movement ID, preserving historical identity',
    );
    assert.equal(saved[0].exercises[0].name, 'Remada articulada');
    assert.equal(JSON.stringify(fixture), original);

    await act(async () =>
      root.render(
        createElement(WorkoutPlanManager, {
          ...props,
          key: 'locked',
          data: {
            ...fixture,
            activeWorkoutSessionId: session.id,
            workoutSessions: { [session.id]: session },
          },
        }),
      ),
    );
    await click(labelled(`Editar ficha ${workouts[0].title}`));
    assert.equal(labelled(`Aumentar séries de ${first.name}`).disabled, true);
    assert.equal(labelled(`Substituir ${first.name}`).disabled, true);
    assert.equal(labelled(`Aumentar carga planejada de ${first.name}`).disabled, true);
    await click(labelled(`Ver execução de ${first.name}`));
    assert.ok(
      document.querySelector('dialog[open]'),
      'references remain available during a locked active session',
    );
    await click(labelled('Fechar referência do exercício'));
    await click(button('Cancelar'));
    await click(button('Novo treino'));
    assert.equal(document.activeElement.tagName, 'H2');
    assert.match(document.querySelector('.editor-empty').textContent, /Seu treino começa/);
    await click(button('Salvar treino'));
    assert.match(document.querySelector('[role="alert"]').textContent, /Escolha pelo menos um exercício/);
    const catalogExercise = createCatalogExercise(exerciseLibrary[0], 'stable-id');
    assert.equal(catalogExercise.imageIndex, undefined, 'render-only metadata stays out of user data');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    dom.window.close();
  }
});
