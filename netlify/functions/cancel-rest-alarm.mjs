import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { authenticateSupabaseUser, authErrorResponse, jsonResponse } from '../lib/supabase-auth.mjs';

function validAlarmId(value) {
  return typeof value === 'string' && /^rest-[a-zA-Z0-9-]{8,80}$/.test(value);
}

function alarmKey(userId, alarmId) {
  return createHash('sha256').update(`${userId}:${alarmId}`).digest('hex');
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

  if (!validAlarmId(body.alarmId)) {
    return jsonResponse(400, { error: 'Alarme inválido.' });
  }

  const store = getStore('ana-fit-rest-alarms');
  await store.setJSON(alarmKey(auth.user.id, body.alarmId), {
    userId: auth.user.id,
    alarmId: body.alarmId,
    cancelled: true,
    cancelledAt: new Date().toISOString(),
  });

  return jsonResponse(200, { ok: true });
};
