import {
  prepareRestNotifications,
  sendAuthenticatedNotificationRequest,
  showRestCompleteNotification,
} from './notifications';

const REMOTE_ALARM_GRACE_MS = 3_000;

type RestAlarmDetails = {
  alarmId: string;
  exerciseName: string;
  endsAt: number;
};

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (audioContext) return audioContext;

  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return null;

  audioContext = new AudioContextClass();
  return audioContext;
}

export function primeRestAlarm() {
  try {
    const context = getAudioContext();
    if (context?.state === 'suspended') {
      void context.resume();
    }
  } catch {
    // The visual alarm remains available if audio is blocked.
  }

  return prepareRestNotifications();
}

function playAlarmSound() {
  try {
    const context = getAudioContext();
    if (!context) return;

    const play = () => {
      const startAt = context.currentTime;
      for (const offset of [0, 0.34, 0.68]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, startAt + offset);
        oscillator.frequency.exponentialRampToValueAtTime(660, startAt + offset + 0.18);
        gain.gain.setValueAtTime(0.0001, startAt + offset);
        gain.gain.exponentialRampToValueAtTime(0.24, startAt + offset + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.24);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt + offset);
        oscillator.stop(startAt + offset + 0.25);
      }
    };

    if (context.state === 'suspended') {
      void context.resume().then(play).catch(() => undefined);
    } else {
      play();
    }
  } catch {
    // The notification and visual alarm still run when Web Audio is unavailable.
  }
}

function vibrateAlarm() {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([320, 120, 320, 120, 650]);
    }
  } catch {
    // iOS currently relies on the system notification haptic instead.
  }
}

export async function scheduleRemoteRestAlarm(details: RestAlarmDetails, subscriptionEndpoint: string | null) {
  if (!subscriptionEndpoint || !import.meta.env.PROD) return;

  try {
    await sendAuthenticatedNotificationRequest('rest-alarm-background', {
      ...details,
      fireAt: details.endsAt + REMOTE_ALARM_GRACE_MS,
      subscriptionEndpoint,
    });
  } catch {
    // The local timer remains the primary path while the app is visible.
  }
}

export async function cancelRemoteRestAlarm(alarmId: string) {
  if (!import.meta.env.PROD) return;

  try {
    await sendAuthenticatedNotificationRequest('cancel-rest-alarm', { alarmId }, { keepalive: true });
  } catch {
    // A duplicate is prevented locally by the notification tag when possible.
  }
}

export async function triggerRestCompleteAlarm(details: RestAlarmDetails, showNotification = true) {
  vibrateAlarm();
  playAlarmSound();

  if (showNotification) {
    await showRestCompleteNotification(details.exerciseName, details.alarmId);
  }
}
