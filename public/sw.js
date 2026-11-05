const CACHE_NAME = 'ana-fit-planner-v15';
const CACHE_PREFIX = 'ana-fit-planner-v';
const NAVIGATION_TIMEOUT_MS = 3500;
const OFFLINE_MANIFEST_URL = '/offline-assets.json';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg?v=2',
  '/pwa-icon.svg?v=2',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/apple-touch-icon.png',
  ...['ferro', 'bronze', 'prata', 'ouro', 'platina', 'diamante', 'elite', 'olympia'].flatMap((rank) =>
    [3, 2, 1].map((division) => `/ranks/${rank}-${division}.png`)
  ),
];

async function precacheApp() {
  const response = await fetch(OFFLINE_MANIFEST_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Não foi possível carregar o manifesto offline: ${response.status}`);
  }

  const generatedAssets = await response.json();
  if (!Array.isArray(generatedAssets) || !generatedAssets.every((asset) => typeof asset === 'string' && asset.startsWith('/assets/'))) {
    throw new Error('Manifesto offline inválido');
  }
  const assets = [...new Set([...APP_SHELL, OFFLINE_MANIFEST_URL, ...generatedAssets])];
  const cache = await caches.open(CACHE_NAME);

  await cache.addAll(assets);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheApp().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        // Keep the previous release for tabs still using its hashed JS/CSS.
        const appCaches = keys.filter((key) => key.startsWith(CACHE_PREFIX));
        const previous = appCaches.filter((key) => key !== CACHE_NAME).at(-1);
        return Promise.all(appCaches.filter((key) => key !== CACHE_NAME && key !== previous).map((key) => caches.delete(key)));
      })
      .then(() => self.clients.claim())
  );
});

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = (await cache.match('/index.html')) || (await cache.match('/'));
  const controller = new self.AbortController();
  const timer = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS);
  try {
    const response = await fetch(request, { signal: controller.signal });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('text/html')) {
      return cached || response;
    }
    // Never replace the offline HTML with a release whose bundles aren't cached yet.
    const html = await response.clone().text();
    const assets = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map((match) => match[1]);
    if (!assets.length) return cached || response;
    const ready = assets.length > 0 && (await Promise.all(assets.map((asset) => cache.match(asset)))).every(Boolean);
    if (ready) {
      try {
        await cache.put('/index.html', response.clone());
      } catch {
        // A falha do cache não deve descartar uma resposta de rede válida.
      }
    }

    return response;
  } catch {
    return cached || Response.error();
  } finally {
    clearTimeout(timer);
  }
}

async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  const type = response.headers.get('content-type') || '';
  if (response.ok && !(new URL(request.url).pathname.startsWith('/assets/') && type.includes('text/html'))) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    } catch {
      // Mantém o recurso utilizável online mesmo se o cache estiver cheio.
    }
  }

  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/.netlify/functions/') ||
    url.pathname === '/sw.js' || url.pathname === '/offline-assets.json' || url.pathname === '/version.json') {
    return;
  }

  event.respondWith(request.mode === 'navigate' ? handleNavigation(request) : handleStaticAsset(request));
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Ana Fit Planner',
    body: 'Você tem um lembrete pendente.',
    tag: 'ana-fit-reminder',
    url: '/',
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      tag: payload.tag,
      renotify: Boolean(payload.renotify),
      requireInteraction: Boolean(payload.requireInteraction),
      vibrate: Array.isArray(payload.vibrate) ? payload.vibrate : undefined,
      data: { url: payload.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => 'focus' in client);
      if (existingClient) {
        if ('navigate' in existingClient) {
          return existingClient.navigate(targetUrl).then((client) => client?.focus());
        }

        return existingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
