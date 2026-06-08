import { getStore } from '@netlify/blobs';
import webpush from 'web-push';

export const config = {
  schedule: '*/15 * * * *',
};

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

  if (!publicKey || !privateKey) {
    throw new Error('Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function getLocalParts(timezone) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .formatToParts(new Date())
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function reminderMinutes(reminder) {
  const [hour, minute] = String(reminder.time || '').split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function buildPayload(reminder) {
  const isWorkout = reminder.kind === 'workout';

  return {
    title: isWorkout ? 'Hora do treino' : 'Hora da refeição',
    body: isWorkout
      ? 'Abra sua rotina de treino e marque quando concluir.'
      : `${reminder.label}: abra a dieta para ver os macros e as gramas.`,
    tag: `ana-fit-${reminder.id}`,
    url: isWorkout ? '/?tab=workout' : '/?tab=diet',
  };
}

async function sendDueReminders(store, blob) {
  const record = await store.get(blob.key, { type: 'json' });
  if (!record?.subscription) {
    return 0;
  }

  const { date, minutes } = getLocalParts(record.timezone || 'America/Sao_Paulo');
  const lastSent = record.lastSent || {};
  let sentCount = 0;

  for (const reminder of record.reminders || []) {
    if (!reminder.enabled) {
      continue;
    }

    const scheduledMinutes = reminderMinutes(reminder);
    if (scheduledMinutes === null) {
      continue;
    }

    const due = minutes >= scheduledMinutes && minutes < scheduledMinutes + 15;
    const alreadySent = lastSent[reminder.id] === date;

    if (!due || alreadySent) {
      continue;
    }

    await webpush.sendNotification(record.subscription, JSON.stringify(buildPayload(reminder)));
    lastSent[reminder.id] = date;
    sentCount += 1;
  }

  if (sentCount) {
    await store.setJSON(blob.key, { ...record, lastSent, updatedAt: new Date().toISOString() });
  }

  return sentCount;
}

export const handler = async () => {
  configureWebPush();

  const store = getStore('ana-fit-push-subscriptions');
  const { blobs } = await store.list();
  let sent = 0;

  for (const blob of blobs) {
    try {
      sent += await sendDueReminders(store, blob);
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await store.delete(blob.key);
      }
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sent }),
  };
};
