import type { NotificationSettings, Reminder } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type NotificationFunctionName = 'subscribe' | 'unsubscribe' | 'rest-alarm-background' | 'cancel-rest-alarm';

type AuthenticatedRequestOptions = {
  accessToken?: string;
  keepalive?: boolean;
};

type KnownSession = {
  userId: string;
  accessToken: string;
};

let knownSession: KnownSession | null = null;
let ownershipQueue = Promise.resolve();

export const defaultReminders: Reminder[] = [
  { id: 'meal-breakfast', label: 'Café da manhã', time: '08:00', enabled: true, kind: 'meal' },
  { id: 'meal-lunch', label: 'Almoço', time: '12:30', enabled: true, kind: 'meal' },
  { id: 'meal-snack', label: 'Lanche', time: '16:30', enabled: true, kind: 'meal' },
  { id: 'meal-dinner', label: 'Jantar', time: '20:00', enabled: true, kind: 'meal' },
  { id: 'workout', label: 'Treino', time: '18:30', enabled: true, kind: 'workout' },
];

export function createDefaultNotificationSettings(): NotificationSettings {
  return {
    enabled: false,
    permission: 'not-requested',
    reminders: defaultReminders,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
  };
}

async function getCurrentAccessToken() {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

export async function sendAuthenticatedNotificationRequest(
  functionName: NotificationFunctionName,
  body: unknown,
  options: AuthenticatedRequestOptions = {}
) {
  const accessToken = options.accessToken || (await getCurrentAccessToken());
  if (!accessToken) return null;

  return fetch(`/.netlify/functions/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
    keepalive: options.keepalive,
  });
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function getVapidPublicKey() {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey) {
    return envKey;
  }

  const response = await fetch('/.netlify/functions/vapid-public-key');
  if (!response.ok) {
    throw new Error('Configure a chave pública VAPID no Netlify para ativar notificações push.');
  }

  const data = (await response.json()) as { publicKey?: string };
  if (!data.publicKey) {
    throw new Error('Chave pública VAPID não encontrada.');
  }

  return data.publicKey;
}

async function getReadyServiceWorker() {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4_000)),
  ]);
}

async function getOrCreatePushSubscription(registration: ServiceWorkerRegistration) {
  if (!('PushManager' in window)) return null;

  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) return existingSubscription;

  const publicKey = await getVapidPublicKey();
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

async function savePushSubscription(
  subscription: PushSubscription,
  settings?: NotificationSettings,
  accessToken?: string
) {
  const response = await sendAuthenticatedNotificationRequest(
    'subscribe',
    {
      subscription: subscription.toJSON(),
      ...(settings ? { reminders: settings.reminders, timezone: settings.timezone } : {}),
    },
    accessToken ? { accessToken } : undefined
  );

  if (!response) {
    if (isSupabaseConfigured) {
      throw new Error('Entre novamente para vincular os alertas à sua conta.');
    }

    // Local development keeps local alarms available without a cloud session.
    return false;
  }

  if (!response.ok) {
    throw new Error('Não foi possível salvar os alertas no servidor.');
  }

  return true;
}

async function getExistingPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

  const registration = await navigator.serviceWorker.getRegistration();
  return registration?.pushManager.getSubscription() ?? null;
}

async function detachExistingPushSubscription(accessToken: string) {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return true;

  const response = await sendAuthenticatedNotificationRequest(
    'unsubscribe',
    { endpoint: subscription.endpoint },
    { accessToken, keepalive: true }
  );

  return Boolean(response?.ok);
}

/**
 * Call this before `supabase.auth.signOut()` when the app owns the logout flow.
 * The auth-state listener below is a fallback, but awaiting this function keeps
 * the user's token available until the server confirms the endpoint removal.
 */
export async function detachPushSubscriptionForCurrentUser() {
  let serverDetached = false;
  try {
    const accessToken = await getCurrentAccessToken();
    if (accessToken) {
      serverDetached = await detachExistingPushSubscription(accessToken);
    }
  } catch {
    // The browser subscription is still invalidated below if the server is offline.
  }

  let browserDetached = true;
  try {
    const subscription = await getExistingPushSubscription();
    if (subscription) {
      browserDetached = await subscription.unsubscribe();
    }
  } catch {
    browserDetached = false;
  }

  return serverDetached && browserDetached;
}

export async function syncPushSubscriptionForCurrentUser(settings: NotificationSettings) {
  const accessToken = await getCurrentAccessToken();
  if (!accessToken) return false;

  const subscription = await getExistingPushSubscription();
  if (!subscription) return false;

  return savePushSubscription(subscription, settings, accessToken);
}

async function syncExistingPushSubscription(accessToken: string) {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;
  await savePushSubscription(subscription, undefined, accessToken);
}

function queueSessionOwnership(nextSession: KnownSession | null) {
  const previousSession = knownSession;
  knownSession = nextSession;

  if (previousSession?.userId === nextSession?.userId) return;

  ownershipQueue = ownershipQueue
    .then(async () => {
      try {
        if (previousSession) {
          await detachExistingPushSubscription(previousSession.accessToken);
        }
      } finally {
        // A failed detach must never prevent the next account from claiming
        // the same endpoint and replacing the previous owner's reminders.
        if (nextSession) {
          await syncExistingPushSubscription(nextSession.accessToken);
        }
      }
    })
    .catch(() => undefined);
}

if (supabase && typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((_event, session) => {
    queueSessionOwnership(
      session
        ? {
            userId: session.user.id,
            accessToken: session.access_token,
          }
        : null
    );
  });
}

export function getNotificationSupportMessage() {
  if (!('serviceWorker' in navigator)) {
    return 'Service worker não disponível neste navegador.';
  }

  if (!('Notification' in window)) {
    return 'Notificações não disponíveis neste navegador.';
  }

  if (!('PushManager' in window)) {
    return 'Push API não disponível. No iPhone, adicione o app à Tela de Início e abra pelo ícone instalado.';
  }

  return null;
}

export async function enablePushNotifications(settings: NotificationSettings) {
  const unsupportedMessage = getNotificationSupportMessage();
  if (unsupportedMessage) {
    throw new Error(unsupportedMessage);
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissão de notificação não concedida.');
  }

  const registration = await getReadyServiceWorker();
  if (!registration) throw new Error('O aplicativo ainda está preparando os alertas. Tente novamente em instantes.');

  const subscription = await getOrCreatePushSubscription(registration);
  if (!subscription) throw new Error('Push não disponível neste aparelho.');
  await savePushSubscription(subscription, settings);

  return {
    endpoint: subscription.endpoint,
    permission,
    syncedAt: new Date().toISOString(),
  };
}

export function prepareRestNotifications(): Promise<string | null> {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return Promise.resolve(null);
  }

  const permissionPromise =
    Notification.permission === 'default'
      ? Notification.requestPermission()
      : Promise.resolve(Notification.permission);

  return permissionPromise.then(async (permission) => {
    if (permission !== 'granted') return null;

    const registration = await getReadyServiceWorker();
    if (!registration) return null;

    try {
      const subscription = await getOrCreatePushSubscription(registration);
      if (!subscription) return null;
      const saved = await savePushSubscription(subscription);
      return saved ? subscription.endpoint : null;
    } catch {
      // Local notification permission can still be used without remote push.
      return null;
    }
  });
}

export async function showRestCompleteNotification(exerciseName: string, alarmId: string) {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return;

  const registration = await getReadyServiceWorker();
  if (!registration) return;

  const options: NotificationOptions & { renotify: boolean; requireInteraction: boolean; vibrate: number[] } = {
    body: `${exerciseName}: hora da próxima série.`,
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: alarmId,
    renotify: true,
    requireInteraction: true,
    vibrate: [320, 120, 320, 120, 650],
    data: { url: '/?tab=workout' },
  };

  await registration.showNotification('Descanso acabou!', options);
}

export async function showTestNotification() {
  const unsupportedMessage = getNotificationSupportMessage();
  if (unsupportedMessage) {
    throw new Error(unsupportedMessage);
  }

  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissão de notificação não concedida.');
  }

  const registration = await getReadyServiceWorker();
  if (!registration) throw new Error('O aplicativo ainda está preparando os alertas. Tente novamente em instantes.');
  await registration.showNotification('Ana Fit Planner', {
    body: 'Notificações ativadas. Os lembretes de treino e refeições vão aparecer aqui.',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: 'ana-fit-test',
    data: { url: '/?tab=diet' },
  });
}
