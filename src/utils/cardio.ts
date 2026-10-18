import type { CardioEntry } from '../types';

export const cardioActivities: Record<CardioEntry['activity'], string> = {
  walk: 'Caminhada',
  run: 'Corrida',
  bike: 'Bicicleta',
  elliptical: 'Elíptico',
  swim: 'Natação',
  other: 'Outro cardio',
};

export function isValidLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function normalizeCardioEntries(value: unknown): CardioEntry[] {
  if (!Array.isArray(value)) return [];
  const entries = new Map<string, CardioEntry>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    if (
      typeof entry.id !== 'string' ||
      !entry.id ||
      !isValidLocalDate(entry.date) ||
      typeof entry.activity !== 'string' ||
      !Object.prototype.hasOwnProperty.call(cardioActivities, entry.activity) ||
      typeof entry.durationMinutes !== 'number' ||
      !Number.isFinite(entry.durationMinutes) ||
      entry.durationMinutes <= 0 ||
      entry.durationMinutes > 1440
    )
      continue;
    const distance =
      typeof entry.distanceKm === 'number' &&
      Number.isFinite(entry.distanceKm) &&
      entry.distanceKm > 0 &&
      entry.distanceKm <= 1000
        ? entry.distanceKm
        : undefined;
    entries.set(entry.id, {
      id: entry.id,
      date: entry.date,
      activity: entry.activity as CardioEntry['activity'],
      durationMinutes: entry.durationMinutes,
      ...(distance ? { distanceKm: distance } : {}),
      ...(typeof entry.note === 'string' ? { note: entry.note.slice(0, 500) } : {}),
    });
  }
  return [...entries.values()].sort((first, second) => second.date.localeCompare(first.date));
}
