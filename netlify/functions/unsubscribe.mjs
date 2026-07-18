import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { authenticateSupabaseUser, authErrorResponse, jsonResponse } from '../lib/supabase-auth.mjs';

function getSubscriptionKey(endpoint) {
  return createHash('sha256').update(endpoint).digest('hex');
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Método não permitido.' });
  }

  const auth = await authenticateSupabaseUser(event.headers);
  if (!auth.ok) return authErrorResponse(auth);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Corpo inválido.' });
  }

  const endpoint = body.endpoint;
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || endpoint.length > 2_048) {
    return jsonResponse(400, { error: 'Endpoint inválido.' });
  }

  const store = getStore('ana-fit-push-subscriptions');
  const key = getSubscriptionKey(endpoint);
  const existing = await store.get(key, { type: 'json' });

  // The ownership check prevents an old session from deleting an endpoint
  // that a different account has already claimed on the same browser.
  if (existing?.userId === auth.user.id) {
    await store.delete(key);
  }

  return jsonResponse(200, { ok: true });
};
