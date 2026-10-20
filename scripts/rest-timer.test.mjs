import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adjustRestTimer,
  createRestTimer,
  formatRestTimer,
  getRemainingRestSeconds,
  getRestTimerStorageKey,
  MAX_REST_SECONDS,
  normalizeRestDuration,
  parseStoredRestTimer,
  REST_TIMER_RESTORE_GRACE_MS,
} from '../src/utils/restTimer.ts';

const now = Date.parse('2026-10-19T09:00:00Z');
const details = { exerciseId: 'hip-thrust', exerciseName: 'Hip thrust', setId: 'series-1', durationSeconds: 90 };
const timer = () => createRestTimer(details, 'rest-initial-12345678', now);

test('rest timer duration is finite, positive, whole seconds and limited to a remote-safe interval', () => {
  for (const value of [NaN, Infinity, -Infinity, -1, 0]) assert.equal(normalizeRestDuration(value), 0);
  assert.equal(normalizeRestDuration(0.2), 1);
  assert.equal(normalizeRestDuration(89.8), 90);
  assert.equal(normalizeRestDuration(99999), MAX_REST_SECONDS);
  assert.equal(createRestTimer({ ...details, durationSeconds: Infinity }, 'rest-invalid-12345678', now), null);
  assert.equal(createRestTimer({ ...details, exerciseName: ' ' }, 'rest-invalid-12345678', now), null);
  assert.equal(createRestTimer(details, 'rest-invalid-12345678', NaN), null);
});

test('countdown uses the absolute deadline and catches up after background suspension', () => {
  const value = timer();
  assert.equal(getRemainingRestSeconds(value, now), 90);
  assert.equal(getRemainingRestSeconds(value, now + 499), 90);
  assert.equal(getRemainingRestSeconds(value, now + 1001), 89);
  assert.equal(getRemainingRestSeconds(value, now + 70000), 20);
  assert.equal(getRemainingRestSeconds(value, now + 300000), 0);
  assert.equal(getRemainingRestSeconds({ endsAt: Infinity }, now), 0);
});

test('adjusting a live rest rotates the alarm ID without losing exercise or set ownership', () => {
  const original = timer();
  const longer = adjustRestTimer(original, 30, 'rest-longer-12345678', now + 20000);
  assert.equal(getRemainingRestSeconds(longer, now + 20000), 100);
  assert.equal(longer.durationSeconds, 120);
  assert.equal(longer.alarmId, 'rest-longer-12345678');
  assert.equal(longer.setId, 'series-1');
  assert.equal(longer.exerciseId, original.exerciseId);
  assert.equal(original.alarmId, 'rest-initial-12345678');
  assert.equal(original.endsAt, now + 90000);
  const shorter = adjustRestTimer(longer, -15, 'rest-shorter-12345678', now + 25000);
  assert.equal(getRemainingRestSeconds(shorter, now + 25000), 80);
  assert.equal(shorter.alarmId, 'rest-shorter-12345678');
});

test('decreasing the final seconds ends now, and increasing rest stays capped', () => {
  const original = timer();
  const ended = adjustRestTimer(original, -15, 'rest-ended-12345678', now + 85000);
  assert.equal(ended.endsAt, now + 85000);
  assert.equal(getRemainingRestSeconds(ended, now + 85000), 0);
  const capped = adjustRestTimer(original, 99999, 'rest-capped-12345678', now);
  assert.equal(getRemainingRestSeconds(capped, now), MAX_REST_SECONDS);
  assert.equal(capped.durationSeconds, MAX_REST_SECONDS);
  assert.equal(adjustRestTimer(capped, 30, 'rest-unused-12345678', now), capped);
  for (const delta of [0, NaN, Infinity])
    assert.equal(adjustRestTimer(original, delta, 'rest-unused-12345678', now), original);
});

test('persisted timer round-trips the exact set, and legacy timers without set IDs still restore', () => {
  const value = timer();
  assert.deepEqual(parseStoredRestTimer(JSON.stringify(value), now + 10000), value);
  const { setId, ...legacy } = value;
  assert.equal(setId, 'series-1');
  assert.deepEqual(parseStoredRestTimer(JSON.stringify(legacy), now + 10000), legacy);
  assert.equal(parseStoredRestTimer(JSON.stringify(value), value.endsAt + 10000).alarmId, value.alarmId);
});

test('restored timers reject corrupt, unbounded, stale or impossible deadlines', () => {
  for (const raw of [null, '', '{broken', '[]', 'null', '42']) assert.equal(parseStoredRestTimer(raw, now), null);
  const invalidFields = [
    { alarmId: 'wrong-id' },
    { exerciseId: '' },
    { exerciseName: ' ' },
    { durationSeconds: MAX_REST_SECONDS + 1 },
    { durationSeconds: 2.5 },
    { durationSeconds: 0 },
    { endsAt: now + 91000 },
    { endsAt: now - REST_TIMER_RESTORE_GRACE_MS - 1 },
    { setId: 4 },
    { setId: '' },
    { setId: 'a'.repeat(257) },
  ];
  for (const change of invalidFields)
    assert.equal(parseStoredRestTimer(JSON.stringify({ ...timer(), ...change }), now), null, JSON.stringify(change));
  const overflow = JSON.stringify(timer()).replace(String(now + 90000), '1e309');
  assert.equal(parseStoredRestTimer(overflow, now), null);
});

test('account storage keys never share guest or another user timer', () => {
  assert.notEqual(getRestTimerStorageKey('user-a'), getRestTimerStorageKey('user-b'));
  assert.notEqual(getRestTimerStorageKey('guest'), getRestTimerStorageKey(null));
  assert.equal(getRestTimerStorageKey('user-a'), 'ana-fit-planner:rest-timer:v1:user:user-a');
  assert.equal(getRestTimerStorageKey(), 'ana-fit-planner:rest-timer:v1:guest');
});

test('rest timer formats a stable clock without NaN, negative values or unpadded seconds', () => {
  assert.equal(formatRestTimer(90), '01:30');
  assert.equal(formatRestTimer(9.5), '00:10');
  assert.equal(formatRestTimer(-5), '00:00');
  assert.equal(formatRestTimer(NaN), '00:00');
  assert.equal(formatRestTimer(Infinity), '00:00');
});

test('provider survives unavailable storage and prevents stale async alarms after adjustment, skip and account switch', async () => {
  const { JSDOM } = await import('jsdom');
  const { createElement, act, StrictMode } = await import('react');
  const { createServer } = await import('vite');
  const dom = new JSDOM('<!doctype html><div id="timer-root"></div>', { url: 'http://localhost/' });
  const previousGlobals = new Map(
    ['window', 'document', 'navigator', 'Notification', 'IS_REACT_ACT_ENVIRONMENT', '__restAlarmTest'].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const stored = new Map();
  let storageBlocked = true;
  const pendingPrime = [];
  const pendingRemote = [];
  const schedules = [];
  const cancellations = [];
  const completions = [];
  Object.defineProperty(dom.window, 'localStorage', {
    configurable: true,
    get() {
      if (storageBlocked) throw new Error('Storage unavailable');
      return {
        getItem: (key) => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
        removeItem: (key) => stored.delete(key),
      };
    },
  });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  }))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  globalThis.__restAlarmTest = {
    prime: () => new Promise((resolve) => pendingPrime.push(resolve)),
    schedule: (value) => {
      schedules.push(value.alarmId);
      return new Promise((resolve) => pendingRemote.push(resolve));
    },
    cancel: (id) => {
      cancellations.push(id);
      return Promise.resolve();
    },
    complete: (value) => {
      completions.push(value.alarmId);
      return Promise.resolve();
    },
  };
  const mockModule = '\0rest-alarm-test';
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'error',
    optimizeDeps: { noDiscovery: true, include: [], entries: [] },
    plugins: [
      {
        name: 'test-rest-alarm',
        enforce: 'pre',
        resolveId(source, importer) {
          return importer?.includes('RestTimerProvider') && source.endsWith('/utils/restAlarm') ? mockModule : null;
        },
        load(id) {
          return id === mockModule
            ? 'export const primeRestAlarm = () => globalThis.__restAlarmTest.prime(); export const scheduleRemoteRestAlarm = (timer) => globalThis.__restAlarmTest.schedule(timer); export const cancelRemoteRestAlarm = (id) => globalThis.__restAlarmTest.cancel(id); export const triggerRestCompleteAlarm = (timer) => globalThis.__restAlarmTest.complete(timer);'
            : null;
        },
      },
    ],
  });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { RestTimerProvider } = await server.ssrLoadModule('/src/components/RestTimerProvider.tsx');
    const { AuthContext } = await server.ssrLoadModule('/src/auth/authContext.ts');
    const { useRestTimer } = await server.ssrLoadModule('/src/hooks/useRestTimer.ts');
    let api;
    function Probe() {
      api = useRestTimer();
      return null;
    }
    root = createRoot(dom.window.document.getElementById('timer-root'));
    const renderAccount = async (id) =>
      act(async () =>
        root.render(
          createElement(
            StrictMode,
            null,
            createElement(
              AuthContext.Provider,
              { value: { user: { id } } },
              createElement(RestTimerProvider, null, createElement(Probe)),
            ),
          ),
        ),
      );
    await renderAccount('account-a');
    await act(async () => api.startRest(details));
    const firstAlarm = api.timer.alarmId;
    assert.equal(api.remainingSeconds, 90, 'blocked storage leaves a functional in-memory timer');
    assert.equal(dom.window.document.querySelector('[role="timer"]').getAttribute('aria-live'), 'off');
    await act(async () => api.adjustRest(30));
    const replacementAlarm = api.timer.alarmId;
    assert.notEqual(replacementAlarm, firstAlarm);
    assert.ok(cancellations.includes(firstAlarm));
    await act(async () => {
      pendingPrime[0]('endpoint');
      pendingPrime[1]('endpoint');
      await Promise.resolve();
    });
    assert.deepEqual(schedules, [replacementAlarm], 'late permission resolution never schedules the superseded alarm');
    await act(async () => api.skipRest());
    await act(async () => {
      pendingRemote.shift()();
      await Promise.resolve();
    });
    assert.equal(api.timer, null);
    assert.ok(
      cancellations.filter((id) => id === replacementAlarm).length >= 2,
      'in-flight schedule is cancelled again after its response',
    );

    storageBlocked = false;
    await act(async () => api.startRest(details));
    const accountAAlarm = api.timer.alarmId;
    assert.ok(stored.has(getRestTimerStorageKey('account-a')));
    await renderAccount('account-b');
    assert.equal(api.timer, null, 'switching account immediately clears the visible timer');
    assert.ok(cancellations.includes(accountAAlarm));
    await act(async () => {
      pendingPrime[2]('endpoint');
      await Promise.resolve();
    });
    assert.deepEqual(schedules, [replacementAlarm], 'unmounted account cannot schedule a pending alarm');
    await act(async () => api.startRest({ ...details, exerciseName: 'Remada' }));
    const permission = { permission: 'granted' };
    Object.defineProperty(dom.window, 'Notification', { configurable: true, value: permission });
    Object.defineProperty(globalThis, 'Notification', { configurable: true, value: permission });
    await renderAccount('account-a');
    assert.equal(api.timer.exerciseName, 'Hip thrust');
    assert.notEqual(api.timer.alarmId, accountAAlarm, 'restoring rotates the alarm ID');
    assert.equal(api.timer.setId, 'series-1');
    const restoredAlarm = api.timer.alarmId;
    await act(async () => {
      for (const resolve of pendingPrime.slice(4)) resolve('endpoint');
      await Promise.resolve();
    });
    assert.equal(schedules.at(-1), restoredAlarm, 'only the current restored alarm is rescheduled in Strict Mode');
    assert.ok(
      !cancellations.includes(restoredAlarm),
      'cleanup of an older alarm cannot cancel the restored replacement',
    );

    await act(async () => {
      api.startRest({ ...details, durationSeconds: 5 });
      api.adjustRest(-15);
    });
    assert.equal(api.timer, null);
    assert.equal(completions.length, 1);
    assert.equal(dom.window.document.querySelectorAll('[role="alert"]').length, 1);
    await act(async () => dom.window.dispatchEvent(new dom.window.Event('focus')));
    assert.equal(completions.length, 1, 'resuming after completion does not ring a second time');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    for (const [key, descriptor] of previousGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
