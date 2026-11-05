import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';

test('offline account, durable outbox, reconnection, concurrent edits and conflict recovery', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, CustomEvent: dom.window.CustomEvent, IS_REACT_ACT_ENVIRONMENT: true };
  const previous = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const oldFetch = globalThis.fetch;
  const oldUrl = process.env.VITE_SUPABASE_URL;
  const oldKey = process.env.VITE_SUPABASE_ANON_KEY;
  process.env.VITE_SUPABASE_URL = 'https://offline-test.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-publishable-key';
  let online = false;
  Object.defineProperty(dom.window.navigator, 'onLine', { get: () => online, configurable: true });
  Object.defineProperty(dom.window.document, 'visibilityState', { value: 'visible', configurable: true });
  const user = { id: 'device-user', email: 'test@example.invalid', aud: 'authenticated', created_at: '2026-01-01T00:00:00Z',
    app_metadata: {}, user_metadata: { display_name: 'Teste' } };
  let revision = 1;
  let remote = { data: { profile: { name: 'Teste' }, workoutSessions: {}, progressEntries: [], water: false }, updated_at: '2026-11-04T10:00:01.000Z' };
  let failRest = false;
  let holdPatch;
  let releasePatch;
  let patchStarted = false;
  let restRequests = 0;
  const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url ?? String(input));
    const method = init?.method ?? 'GET';
    if (url.pathname.endsWith('/auth/v1/user')) return json(user);
    if (url.pathname.endsWith('/auth/v1/logout')) return json({});
    if (url.pathname.endsWith('/rest/v1/anfit_user_app_data')) {
      restRequests += 1;
      if (failRest) return json({ message: 'temporarily unavailable' }, 503);
      if (method === 'GET') return json(remote ? [remote] : []);
      if (method === 'PATCH') {
        patchStarted = true;
        if (holdPatch) await holdPatch;
        const expected = url.searchParams.get('updated_at')?.slice(3);
        if (expected !== remote.updated_at) return json(null);
        const { data } = JSON.parse(init.body);
        revision += 1;
        remote = { data, updated_at: `2026-11-04T10:00:${String(revision).padStart(2, '0')}.000Z` };
        return json(remote);
      }
    }
    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  };
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error',
    optimizeDeps: { noDiscovery: true, include: [], entries: [] } });
  let root;
  let client;
  try {
    const { createRoot } = await import('react-dom/client');
    const storage = await server.ssrLoadModule('/src/lib/storage.ts');
    const offline = await server.ssrLoadModule('/src/lib/offlineSession.ts');
    const { AuthGate } = await server.ssrLoadModule('/src/auth/AuthGate.tsx');
    const { AuthContext, useAuth } = await server.ssrLoadModule('/src/auth/authContext.ts');
    const { supabase, supabaseAuthStorageKey } = await server.ssrLoadModule('/src/lib/supabase.ts');
    const { useCloudSync } = await server.ssrLoadModule('/src/hooks/useCloudSync.ts');
    const { useLocalStorage } = await server.ssrLoadModule('/src/hooks/useLocalStorage.ts');
    const { mergeCloudData, withCloudNutrition } = await server.ssrLoadModule('/src/lib/cloudMerge.ts');
    client = supabase;
    assert.ok(client, 'the test uses the configured real Supabase client against a stubbed transport');
    const store = dom.window.localStorage;
    store.setItem(storage.CLOUD_OWNER_STORAGE_KEY, user.id);
    storage.writeStoredAppData(remote.data, user.id);
    offline.rememberOfflineUser(user);
    root = createRoot(dom.window.document.getElementById('root'));
    let authContext;
    function AccountProbe() { authContext = useAuth(); return createElement('p', null, 'Aplicativo disponível offline'); }
    await act(async () => root.render(createElement(AuthGate, null, createElement(AccountProbe))));
    assert.match(dom.window.document.body.textContent, /disponível offline/);
    assert.equal(restRequests, 0, 'opening the cached account never waits for the database');
    await act(async () => authContext.signOut());
    assert.match(dom.window.document.body.textContent, /Entrar no Ana Fit/);
    assert.equal(offline.readOfflineUser(supabaseAuthStorageKey), null, 'explicit logout disables offline reopening');
    assert.ok(storage.readStoredAppData(user.id, false), 'logout preserves pending local records');
    offline.rememberOfflineUser(user);
    store.setItem(storage.CLOUD_OWNER_STORAGE_KEY, 'someone-else');
    assert.equal(offline.readOfflineUser(supabaseAuthStorageKey), null, 'a different owner cannot open this cache');
    store.setItem(storage.CLOUD_OWNER_STORAGE_KEY, user.id);
    store.setItem(supabaseAuthStorageKey, JSON.stringify({ user: { ...user, id: 'different-session' } }));
    assert.equal(offline.readOfflineUser(supabaseAuthStorageKey), null, 'a newly selected account cannot flash the previous account cache');
    store.removeItem(supabaseAuthStorageKey);
    storage.writeCloudBase(user.id, remote.data, remote.updated_at);
    await act(async () => root.render(createElement('p', null, 'account test complete')));
    await client.auth.signOut({ scope: 'local' });
    const sessionResult = await client.auth.setSession({ access_token: `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ exp: 4102444800, sub: user.id })).toString('base64url')}.${Buffer.from('test signature').toString('base64url')}`, refresh_token: 'test-refresh-token' });
    assert.equal(sessionResult.error, null);

    let current;
    let sync;
    let change;
    function SyncProbe() {
      const [data, setData] = useLocalStorage(storage.APP_STORAGE_KEY, {});
      current = data; change = setData; sync = useCloudSync(data);
      return createElement('p', null, sync.status);
    }
    const auth = { user, cloudEnabled: true, migrationResult: 'empty', forgetAfterDays: null, signOut: async () => {} };
    await act(async () => root.render(createElement(AuthContext.Provider, { value: auth }, createElement(SyncProbe))));
    await act(async () => change((data) => ({ ...data, water: true })));
    assert.equal(storage.readStoredAppData(user.id, false).data.water, true, 'the interaction is persisted before closing');
    const pending = storage.readCloudPendingMarker(user.id);
    assert.ok(pending?.version);
    await act(async () => assert.equal(await sync.retry(), false));
    assert.equal(sync.status, 'offline');
    assert.equal(remote.data.water, false);

    // A full remount simulates closing and reopening the installed app while offline.
    await act(async () => root.render(createElement('p', null, 'closed')));
    await act(async () => root.render(createElement(AuthContext.Provider, { value: auth }, createElement(SyncProbe))));
    assert.equal(current.water, true);
    assert.equal(storage.readCloudPendingMarker(user.id).version, pending.version);
    online = true;
    await act(async () => { dom.window.dispatchEvent(new dom.window.Event('online')); await new Promise((resolve) => setTimeout(resolve, 50)); });
    assert.equal(remote.data.water, true, 'reconnection uploads without another user action');
    assert.equal(sync.status, 'saved');
    assert.equal(storage.readCloudPendingMarker(user.id), null);

    await act(async () => change((data) => ({ ...data, workoutSessions: { device: { id: 'device', weight: 20 } } })));
    remote = { data: { ...remote.data, workoutSessions: { cloud: { id: 'cloud', weight: 30 } } }, updated_at: '2026-11-04T11:00:00.000Z' };
    await act(async () => assert.equal(await sync.retry(), true));
    assert.deepEqual(Object.keys(remote.data.workoutSessions).sort(), ['cloud', 'device']);
    assert.deepEqual(Object.keys(current.workoutSessions).sort(), ['cloud', 'device']);

    await act(async () => change((data) => ({ ...data, profile: { name: 'Local' } })));
    remote = { data: { ...remote.data, profile: { name: 'Cloud' } }, updated_at: '2026-11-04T11:01:00.000Z' };
    await act(async () => assert.equal(await sync.retry(), false));
    assert.equal(sync.status, 'conflict');
    assert.equal(current.profile.name, 'Local', 'a conflict does not block or replace local data');
    await act(async () => assert.equal(await sync.resolveConflict('local'), true));
    assert.equal(remote.data.profile.name, 'Local');
    assert.ok(store.getItem(`ana-fit-planner:conflict-backup:user:${user.id}:latest`));

    await act(async () => change((data) => ({ ...data, water: false })));
    holdPatch = new Promise((resolve) => { releasePatch = resolve; });
    patchStarted = false;
    let uploading;
    await act(async () => {
      uploading = sync.retry();
      for (let i = 0; i < 20 && !patchStarted; i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
    });
    assert.equal(patchStarted, true);
    await act(async () => change((data) => ({ ...data, lateEdit: 'preserved' })));
    await act(async () => { releasePatch(); await uploading; });
    holdPatch = null;
    assert.equal(current.lateEdit, 'preserved');
    assert.ok(storage.readCloudPendingMarker(user.id), 'a late edit is not acknowledged by an earlier upload');
    await act(async () => assert.equal(await sync.retry(), true));
    assert.equal(remote.data.lateEdit, 'preserved');

    failRest = true;
    await act(async () => change((data) => ({ ...data, survivesOutage: true })));
    await act(async () => assert.equal(await sync.retry(), false));
    assert.equal(storage.readStoredAppData(user.id, false).data.survivesOutage, true);
    failRest = false;
    await act(async () => assert.equal(await sync.retry(), true));
    assert.equal(remote.data.survivesOutage, true);

    const result = mergeCloudData({ rows: [{ id: 'old', n: 1 }] }, { rows: [] }, { rows: [{ id: 'old', n: 1 }, { id: 'new', n: 2 }] });
    assert.deepEqual(result.data.rows.map((item) => item.id), ['new'], 'deletion does not resurrect old items');
    assert.equal(result.conflicts.length, 0);
    const plan = { assignedNutritionPlan: { id: 'assigned' }, goals: { protein: 100 }, meals: [], profile: { preferredFoods: ['rice'], avoidedFoods: [] } };
    assert.deepEqual(withCloudNutrition({ profile: { name: 'Local' }, goals: { protein: 1 } }, plan).goals, { protein: 100 });
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    if (root) await act(async () => root.unmount());
    if (client) await client.auth.dispose();
    await server.close();
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.VITE_SUPABASE_URL; else process.env.VITE_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.VITE_SUPABASE_ANON_KEY; else process.env.VITE_SUPABASE_ANON_KEY = oldKey;
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
    dom.window.close();
  }
});

test('service worker falls back for HTTP errors and timeouts and keeps coherent releases', async () => {
  const listeners = {};
  const store = new Map([['/index.html', new Response('<html>offline app</html>')], ['/assets/current.js', new Response('app')]]);
  const deleted = [];
  const cache = { match: async (key) => store.get(typeof key === 'string' ? key : new URL(key.url).pathname)?.clone(),
    put: async (key, value) => store.set(key, value), addAll: async () => {} };
  let network = async () => new Response('error code', { status: 503 });
  const context = { Response, URL, setTimeout: (callback, ms) => setTimeout(callback, ms === 3500 ? 5 : ms), clearTimeout,
    caches: { open: async () => cache, match: cache.match, keys: async () => ['other-app', 'ana-fit-planner-v12', 'ana-fit-planner-v13', 'ana-fit-planner-v16'], delete: async (key) => deleted.push(key) },
    fetch: (...args) => network(...args), self: { AbortController, location: { origin: 'https://app.test' },
      addEventListener: (type, handler) => { listeners[type] = handler; }, clients: { claim: async () => {} } } };
  vm.runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), context);
  const navigate = async () => {
    let response;
    listeners.fetch({ request: { mode: 'navigate', method: 'GET', url: 'https://app.test/?tab=workout' }, respondWith: (value) => { response = value; } });
    return await (await response).text();
  };
  assert.match(await navigate(), /offline app/, 'HTTP 503 opens the cached app');
  network = async () => new Response('error text', { headers: { 'Content-Type': 'text/plain' } });
  assert.match(await navigate(), /offline app/, 'invalid navigation content opens the cached app');
  network = async () => new Response('<html>gateway error</html>', { headers: { 'Content-Type': 'text/html' } });
  assert.match(await navigate(), /offline app/, 'a branded error page with status 200 also opens the cached app');
  network = async () => { throw new TypeError('no internet'); };
  assert.match(await navigate(), /offline app/);
  network = (_request, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout'))));
  assert.match(await navigate(), /offline app/, 'a stalled server cannot hang reopening');
  network = async () => new Response('<html><script src="/assets/new.js"></script>new app</html>', { headers: { 'Content-Type': 'text/html' } });
  assert.match(await navigate(), /new app/);
  assert.match(await store.get('/index.html').clone().text(), /offline app/, 'new HTML cannot poison an older offline release');
  let activation;
  listeners.activate({ waitUntil: (promise) => { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, ['ana-fit-planner-v12']);
});
