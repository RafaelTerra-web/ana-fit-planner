import { getStore } from '@netlify/blobs';

function validAlarmId(value) {
  return typeof value === 'string' && /^rest-[a-zA-Z0-9-]{8,80}$/.test(value);
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: '' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: '' };
  }

  if (!validAlarmId(body.alarmId)) {
    return { statusCode: 400, body: '' };
  }

  const store = getStore('ana-fit-rest-alarms');
  await store.setJSON(body.alarmId, { cancelled: true, cancelledAt: new Date().toISOString() });
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
