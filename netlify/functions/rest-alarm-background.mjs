import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import webpush from 'web-push';

export const config = {
  background: true,
  method: 'POST',
};

function subscriptionKey(endpoint) {
  return createHash('sha256').update(endpoint).digest('hex');
}

function validAlarmId(value) {
  return typeof value === 'string' && /^rest-[a-zA-Z0-9-]{8,80}$/.test(value);
}

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'https://anfit.netlify.app';
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export default async (request) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return;
  }

  const alarmId = body.alarmId;
  const endpoint = body.subscriptionEndpoint;
  const fireAt = Number(body.fireAt);
  const exerciseName = String(body.exerciseName || 'Exercício').slice(0, 80);
  const waitMs = fireAt - Date.now();

  if (
    !validAlarmId(alarmId) ||
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('https://') ||
    endpoint.length > 2_048 ||
    !Number.isFinite(fireAt) ||
    waitMs < -10_000 ||
    waitMs > 15 * 60 * 1_000
  ) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, Math.max(0, waitMs)));

  const alarmStore = getStore('ana-fit-rest-alarms');
  const cancellation = await alarmStore.get(alarmId, { type: 'json' });
  if (cancellation?.cancelled) {
    await alarmStore.delete(alarmId);
    return;
  }

  const subscriptionStore = getStore('ana-fit-push-subscriptions');
  const key = subscriptionKey(endpoint);
  const record = await subscriptionStore.get(key, { type: 'json' });
  if (!record?.subscription || record.subscription.endpoint !== endpoint || !configureWebPush()) {
    return;
  }

  try {
    await webpush.sendNotification(
      record.subscription,
      JSON.stringify({
        title: 'Descanso acabou!',
        body: `${exerciseName}: hora da próxima série.`,
        tag: alarmId,
        url: '/?tab=workout',
        renotify: true,
        requireInteraction: true,
        vibrate: [320, 120, 320, 120, 650],
      })
    );
  } catch (error) {
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      await subscriptionStore.delete(key);
    }
  } finally {
    await alarmStore.delete(alarmId);
  }
};
