import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import webpush from 'web-push';
import { authenticateSupabaseUser } from '../lib/supabase-auth.mjs';

export const config = {
  background: true,
  method: 'POST',
};

function subscriptionKey(endpoint) {
  return createHash('sha256').update(endpoint).digest('hex');
}

function alarmKey(userId, alarmId) {
  return createHash('sha256').update(`${userId}:${alarmId}`).digest('hex');
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
  const auth = await authenticateSupabaseUser(request.headers);
  if (!auth.ok) return;

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

  const subscriptionStore = getStore('ana-fit-push-subscriptions');
  const subscriptionBlobKey = subscriptionKey(endpoint);
  const initialRecord = await subscriptionStore.get(subscriptionBlobKey, { type: 'json' });
  if (
    initialRecord?.userId !== auth.user.id ||
    !initialRecord.subscription ||
    initialRecord.subscription.endpoint !== endpoint
  ) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, Math.max(0, waitMs)));

  const alarmStore = getStore('ana-fit-rest-alarms');
  const alarmBlobKey = alarmKey(auth.user.id, alarmId);
  const cancellation = await alarmStore.get(alarmBlobKey, { type: 'json' });
  if (cancellation?.cancelled) {
    await alarmStore.delete(alarmBlobKey);
    return;
  }

  // Check ownership again after the wait. A logout or account switch may have
  // removed or reassigned this browser endpoint while the alarm was pending.
  const record = await subscriptionStore.get(subscriptionBlobKey, { type: 'json' });
  if (
    record?.userId !== auth.user.id ||
    !record.subscription ||
    record.subscription.endpoint !== endpoint ||
    !configureWebPush()
  ) {
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
      await subscriptionStore.delete(subscriptionBlobKey);
    }
  } finally {
    await alarmStore.delete(alarmBlobKey);
  }
};
