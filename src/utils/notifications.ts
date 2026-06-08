import type { NotificationSettings, Reminder } from '../types';

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

  const registration = await navigator.serviceWorker.ready;
  const publicKey = await getVapidPublicKey();
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await fetch('/.netlify/functions/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      reminders: settings.reminders,
      timezone: settings.timezone,
    }),
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Não foi possível salvar os lembretes no servidor.');
    }
  });

  return {
    endpoint: subscription.endpoint,
    permission,
    syncedAt: new Date().toISOString(),
  };
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

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('Ana Fit Planner', {
    body: 'Notificações ativadas. Os lembretes de treino e refeições vão aparecer aqui.',
    icon: '/pwa-icon.svg',
    badge: '/pwa-icon.svg',
    tag: 'ana-fit-test',
    data: { url: '/?tab=diet' },
  });
}
