const CACHE_NAME = 'ana-fit-planner-v11';
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
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (response.ok && contentType.includes('text/html')) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put('/index.html', response.clone());
      } catch {
        // A falha do cache não deve descartar uma resposta de rede válida.
      }
    }

    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match('/index.html')) || Response.error();
  }
}

async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
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
  if (url.origin !== self.location.origin || url.pathname.startsWith('/.netlify/functions/')) {
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
