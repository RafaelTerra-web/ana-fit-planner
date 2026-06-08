import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

function getSubscriptionKey(endpoint) {
  return createHash('sha256').update(endpoint).digest('hex');
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Método não permitido.' }),
    };
  }

  const body = JSON.parse(event.body || '{}');
  const subscription = body.subscription;

  if (!subscription?.endpoint) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Assinatura inválida.' }),
    };
  }

  const store = getStore('ana-fit-push-subscriptions');
  const key = getSubscriptionKey(subscription.endpoint);

  await store.setJSON(key, {
    subscription,
    reminders: Array.isArray(body.reminders) ? body.reminders : [],
    timezone: body.timezone || 'America/Sao_Paulo',
    lastSent: {},
    updatedAt: new Date().toISOString(),
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
