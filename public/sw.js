const CACHE_NAME = 'ana-fit-planner-v6';
const APP_SHELL = [
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-icon.svg',
  ...['ferro', 'bronze', 'prata', 'ouro', 'platina', 'diamante', 'elite', 'olympia'].flatMap((rank) =>
    [3, 2, 1].map((division) => `/ranks/${rank}-${division}.png`)
  ),
];

function getViteAssetUrls(html) {
  const assetUrls = new Set();
  const attributePattern = /(?:src|href)=["']([^"']+)["']/g;
  let match = attributePattern.exec(html);

  while (match) {
    const url = new URL(match[1], self.location.origin);
    if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
      assetUrls.add(`${url.pathname}${url.search}`);
    }
    match = attributePattern.exec(html);
  }

  return [...assetUrls];
}

async function fetchAndCache(cache, url) {
  const response = await fetch(url, { cache: 'reload' });
  if (!response.ok) {
    throw new Error(`Nao foi possivel armazenar ${url}: ${response.status}`);
  }

  await cache.put(url, response);
}

async function precacheApp() {
  const cache = await caches.open(CACHE_NAME);
  const indexResponse = await fetch('/index.html', { cache: 'reload' });
  if (!indexResponse.ok) {
    throw new Error(`Nao foi possivel carregar o app: ${indexResponse.status}`);
  }

  const html = await indexResponse.clone().text();
  const viteAssetUrls = getViteAssetUrls(html);

  await cache.put('/index.html', indexResponse);
  await Promise.all([...APP_SHELL, ...viteAssetUrls].map((url) => fetchAndCache(cache, url)));
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put('/index.html', response.clone());
            } catch {
              // A falha do cache nao deve descartar uma resposta de rede valida.
            }
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ??
        fetch(event.request).then(async (response) => {
          if (response.ok) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(event.request, response.clone());
            } catch {
              // Mantem o recurso utilizavel online mesmo se o cache estiver cheio.
            }
          }

          return response;
        })
    )
  );
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
      icon: '/pwa-icon.svg',
      badge: '/pwa-icon.svg',
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
