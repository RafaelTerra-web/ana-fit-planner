import type {
  RankDivision,
  RankLevelId,
  RankState,
  RankTierId,
  RankXpEvent,
  RankXpKind,
} from '../types';

export type RankLevel = {
  id: RankLevelId;
  tier: RankTierId;
  label: string;
  division: RankDivision;
  minXp: number;
  crestSrc: string;
};

export type RankTier = {
  id: RankTierId;
  label: string;
  crestSrc: string;
};

export type RankProgress = {
  current: RankLevel;
  next: RankLevel | null;
  totalXp: number;
  xpIntoLevel: number;
  xpToNext: number;
  percent: number;
};

type RankEventBase = {
  dateKey: string;
  sourceId: string;
  awardedAt?: string;
};

export type RankEventInput =
  | (RankEventBase & {
      kind: 'workout';
      completedSets: number;
      plannedSetCount: number;
    })
  | (RankEventBase & {
      kind: Exclude<RankXpKind, 'workout' | 'inactivity-decay'>;
    });

export type RankInactivityStatus = {
  lastCoreActivityAt: string;
  protectionEndsAt: string;
  nextDecayAt: string | null;
  inactiveDays: number;
  daysUntilNextDecay: number;
  pendingCheckpoints: number;
  isProtected: boolean;
  currentXp: number;
  nextDecayXp: number;
};

const DAY_IN_MS = 86_400_000;
const WEEK_IN_MS = DAY_IN_MS * 7;
const INACTIVITY_PROTECTION_IN_MS = DAY_IN_MS * 14;
const INACTIVITY_DECAY_RATE = 0.02;
const INACTIVITY_DECAY_MIN_XP = 50;
const INACTIVITY_DECAY_MAX_XP = 300;
const CORE_ACTIVITY_KINDS = new Set<RankXpKind>([
  'workout',
  'cardio',
  'nutrition',
  'progress-checkin',
]);
const VALID_RANK_XP_KINDS = new Set<RankXpKind>([
  'workout',
  'cardio',
  'nutrition',
  'water',
  'steps',
  'progress-checkin',
  'inactivity-decay',
]);

export const RANK_TIERS: readonly RankTier[] = [
  { id: 'ferro', label: 'Ferro', crestSrc: '/ranks/ferro-3.png' },
  { id: 'bronze', label: 'Bronze', crestSrc: '/ranks/bronze-3.png' },
  { id: 'prata', label: 'Prata', crestSrc: '/ranks/prata-3.png' },
  { id: 'ouro', label: 'Ouro', crestSrc: '/ranks/ouro-3.png' },
  { id: 'platina', label: 'Platina', crestSrc: '/ranks/platina-3.png' },
  { id: 'diamante', label: 'Diamante', crestSrc: '/ranks/diamante-3.png' },
  { id: 'elite', label: 'Elite', crestSrc: '/ranks/elite-3.png' },
  { id: 'olympia', label: 'Olympia', crestSrc: '/ranks/olympia-3.png' },
] as const;

export const RANK_LEVELS: readonly RankLevel[] = [
  { id: 'ferro-3', tier: 'ferro', label: 'Ferro', division: 3, minXp: 0, crestSrc: '/ranks/ferro-3.png' },
  { id: 'ferro-2', tier: 'ferro', label: 'Ferro', division: 2, minXp: 300, crestSrc: '/ranks/ferro-2.png' },
  { id: 'ferro-1', tier: 'ferro', label: 'Ferro', division: 1, minXp: 700, crestSrc: '/ranks/ferro-1.png' },
  { id: 'bronze-3', tier: 'bronze', label: 'Bronze', division: 3, minXp: 1_200, crestSrc: '/ranks/bronze-3.png' },
  { id: 'bronze-2', tier: 'bronze', label: 'Bronze', division: 2, minXp: 1_800, crestSrc: '/ranks/bronze-2.png' },
  { id: 'bronze-1', tier: 'bronze', label: 'Bronze', division: 1, minXp: 2_500, crestSrc: '/ranks/bronze-1.png' },
  { id: 'prata-3', tier: 'prata', label: 'Prata', division: 3, minXp: 3_300, crestSrc: '/ranks/prata-3.png' },
  { id: 'prata-2', tier: 'prata', label: 'Prata', division: 2, minXp: 4_200, crestSrc: '/ranks/prata-2.png' },
  { id: 'prata-1', tier: 'prata', label: 'Prata', division: 1, minXp: 5_200, crestSrc: '/ranks/prata-1.png' },
  { id: 'ouro-3', tier: 'ouro', label: 'Ouro', division: 3, minXp: 6_300, crestSrc: '/ranks/ouro-3.png' },
  { id: 'ouro-2', tier: 'ouro', label: 'Ouro', division: 2, minXp: 7_500, crestSrc: '/ranks/ouro-2.png' },
  { id: 'ouro-1', tier: 'ouro', label: 'Ouro', division: 1, minXp: 8_800, crestSrc: '/ranks/ouro-1.png' },
  { id: 'platina-3', tier: 'platina', label: 'Platina', division: 3, minXp: 10_200, crestSrc: '/ranks/platina-3.png' },
  { id: 'platina-2', tier: 'platina', label: 'Platina', division: 2, minXp: 11_700, crestSrc: '/ranks/platina-2.png' },
  { id: 'platina-1', tier: 'platina', label: 'Platina', division: 1, minXp: 13_300, crestSrc: '/ranks/platina-1.png' },
  { id: 'diamante-3', tier: 'diamante', label: 'Diamante', division: 3, minXp: 15_000, crestSrc: '/ranks/diamante-3.png' },
  { id: 'diamante-2', tier: 'diamante', label: 'Diamante', division: 2, minXp: 16_800, crestSrc: '/ranks/diamante-2.png' },
  { id: 'diamante-1', tier: 'diamante', label: 'Diamante', division: 1, minXp: 18_700, crestSrc: '/ranks/diamante-1.png' },
  { id: 'elite-3', tier: 'elite', label: 'Elite', division: 3, minXp: 20_700, crestSrc: '/ranks/elite-3.png' },
  { id: 'elite-2', tier: 'elite', label: 'Elite', division: 2, minXp: 22_800, crestSrc: '/ranks/elite-2.png' },
  { id: 'elite-1', tier: 'elite', label: 'Elite', division: 1, minXp: 25_000, crestSrc: '/ranks/elite-1.png' },
  { id: 'olympia-3', tier: 'olympia', label: 'Olympia', division: 3, minXp: 27_500, crestSrc: '/ranks/olympia-3.png' },
  { id: 'olympia-2', tier: 'olympia', label: 'Olympia', division: 2, minXp: 30_500, crestSrc: '/ranks/olympia-2.png' },
  { id: 'olympia-1', tier: 'olympia', label: 'Olympia', division: 1, minXp: 34_000, crestSrc: '/ranks/olympia-1.png' },
] as const;

export const RANK_XP = {
  cardio: 35,
  nutrition: 30,
  water: 10,
  steps: 10,
  'progress-checkin': 40,
} as const satisfies Record<Exclude<RankXpKind, 'workout' | 'inactivity-decay'>, number>;

const ROMAN_DIVISIONS: Record<RankDivision, string> = {
  3: 'III',
  2: 'II',
  1: 'I',
};

function normalizeXp(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function normalizeEventXp(kind: RankXpKind, value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const normalized = Math.floor(Math.abs(value));
  if (normalized === 0) {
    return 0;
  }

  if (kind === 'inactivity-decay') {
    return value < 0 ? -normalized : 0;
  }

  return value > 0 ? normalized : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day, utcDate };
}

function getDateKeyTimestamp(dateKey: string) {
  const parsed = parseDateKey(dateKey);
  return parsed ? new Date(parsed.year, parsed.month - 1, parsed.day).getTime() : null;
}

function getValidTimestamp(value: string | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getEventTimestamp(event: RankXpEvent, nowTimestamp: number) {
  const awardedAtTimestamp = getValidTimestamp(event.awardedAt);
  if (awardedAtTimestamp !== null && awardedAtTimestamp <= nowTimestamp) {
    return awardedAtTimestamp;
  }

  const dateKeyTimestamp = getDateKeyTimestamp(event.dateKey);
  return dateKeyTimestamp !== null && dateKeyTimestamp <= nowTimestamp ? dateKeyTimestamp : null;
}

function getInactivityAnchor(state: RankState, nowTimestamp: number) {
  const startedOnTimestamp = getDateKeyTimestamp(state.startedOn) ?? nowTimestamp;
  let timestamp = Math.min(startedOnTimestamp, nowTimestamp);

  for (const event of Object.values(state.events)) {
    if (!CORE_ACTIVITY_KINDS.has(event.kind) || event.xp <= 0) {
      continue;
    }

    const eventTimestamp = getEventTimestamp(event, nowTimestamp);
    if (eventTimestamp !== null && eventTimestamp <= nowTimestamp && eventTimestamp > timestamp) {
      timestamp = eventTimestamp;
    }
  }

  return timestamp;
}

function getDecayEventId(anchorTimestamp: number, checkpoint: number) {
  return `inactivity-decay:${anchorTimestamp}:${checkpoint}`;
}

function getCheckpointTimestamp(anchorTimestamp: number, checkpoint: number) {
  return anchorTimestamp + INACTIVITY_PROTECTION_IN_MS + (checkpoint - 1) * WEEK_IN_MS;
}

function getDueCheckpointCount(anchorTimestamp: number, nowTimestamp: number) {
  const firstCheckpointTimestamp = getCheckpointTimestamp(anchorTimestamp, 1);
  if (nowTimestamp < firstCheckpointTimestamp) {
    return 0;
  }

  return Math.floor((nowTimestamp - firstCheckpointTimestamp) / WEEK_IN_MS) + 1;
}

function getProcessedCheckpointCount(state: RankState, anchorTimestamp: number) {
  let processedCheckpoints =
    state.decayCursor?.anchorTimestamp === anchorTimestamp
      ? state.decayCursor.processedCheckpoints
      : 0;

  while (state.events[getDecayEventId(anchorTimestamp, processedCheckpoints + 1)]) {
    processedCheckpoints += 1;
  }

  return processedCheckpoints;
}

function calculateInactivityDecayXp(currentXp: number) {
  if (currentXp <= 0) {
    return 0;
  }

  const proportionalDecay = Math.round(currentXp * INACTIVITY_DECAY_RATE);
  return Math.min(
    currentXp,
    Math.max(INACTIVITY_DECAY_MIN_XP, Math.min(INACTIVITY_DECAY_MAX_XP, proportionalDecay))
  );
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getIsoWeekKey(dateKey: string) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    throw new Error(`Data inválida para semana ISO: ${dateKey}`);
  }

  const thursday = new Date(parsed.utcDate.getTime());
  const isoDay = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - isoDay);

  const weekYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  const firstIsoDay = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstIsoDay);

  const weekNumber = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / WEEK_IN_MS);
  return `${weekYear}-W${String(weekNumber).padStart(2, '0')}`;
}

export function createInitialRankState(date = new Date()): RankState {
  return {
    schemaVersion: 2,
    startedOn: getLocalDateKey(date),
    events: {},
    lastCelebratedLevelId: 'ferro-3',
  };
}

export function normalizeRankState(value: unknown, now = new Date()): RankState {
  const fallback = createInitialRankState(now);
  if (!isRecord(value)) {
    return fallback;
  }

  const parsedNowTimestamp = now.getTime();
  const nowTimestamp = Number.isFinite(parsedNowTimestamp) ? parsedNowTimestamp : Date.now();
  const currentDateKey = getLocalDateKey(new Date(nowTimestamp));
  const rawEvents = isRecord(value.events) ? value.events : {};
  const events = Object.entries(rawEvents).reduce<Record<string, RankXpEvent>>((normalized, [storageKey, rawEvent]) => {
    if (!isRecord(rawEvent) || typeof rawEvent.kind !== 'string' || !VALID_RANK_XP_KINDS.has(rawEvent.kind as RankXpKind)) {
      return normalized;
    }

    const kind = rawEvent.kind as RankXpKind;
    const xp = Number(rawEvent.xp);
    const dateKey = typeof rawEvent.dateKey === 'string' ? rawEvent.dateKey : '';
    const normalizedXp = normalizeEventXp(kind, xp);
    if (
      normalizedXp === 0 ||
      !parseDateKey(dateKey) ||
      (kind === 'inactivity-decay' ? xp >= 0 : xp <= 0)
    ) {
      return normalized;
    }

    const canonicalId = typeof rawEvent.id === 'string' && rawEvent.id.trim() ? rawEvent.id.trim() : storageKey;
    if (!canonicalId || normalized[canonicalId]) {
      return normalized;
    }

    const awardedTimestamp = getValidTimestamp(typeof rawEvent.awardedAt === 'string' ? rawEvent.awardedAt : undefined);
    const fallbackTimestamp = getDateKeyTimestamp(dateKey) ?? nowTimestamp;
    const normalizedAwardedAt = awardedTimestamp !== null && awardedTimestamp <= nowTimestamp
      ? new Date(awardedTimestamp).toISOString()
      : new Date(fallbackTimestamp).toISOString();

    normalized[canonicalId] = {
      id: canonicalId,
      kind,
      xp: normalizedXp,
      dateKey,
      sourceId: typeof rawEvent.sourceId === 'string' && rawEvent.sourceId.trim()
        ? rawEvent.sourceId.trim()
        : canonicalId,
      awardedAt: normalizedAwardedAt,
    };
    return normalized;
  }, {});

  const startedOn =
    typeof value.startedOn === 'string' && parseDateKey(value.startedOn) && value.startedOn <= currentDateKey
    ? value.startedOn
    : fallback.startedOn;
  const lastCelebratedLevelId = typeof value.lastCelebratedLevelId === 'string' &&
    RANK_LEVELS.some((level) => level.id === value.lastCelebratedLevelId)
    ? (value.lastCelebratedLevelId as RankLevelId)
    : fallback.lastCelebratedLevelId;
  const normalizedBaseState: RankState = {
    schemaVersion: 2,
    startedOn,
    events,
    lastCelebratedLevelId,
  };
  const expectedAnchorTimestamp = getInactivityAnchor(normalizedBaseState, nowTimestamp);
  const maximumProcessedCheckpoints = getDueCheckpointCount(expectedAnchorTimestamp, nowTimestamp);
  const rawDecayCursor = isRecord(value.decayCursor) ? value.decayCursor : null;
  const cursorAnchorTimestamp = rawDecayCursor?.anchorTimestamp;
  const cursorProcessedCheckpoints = rawDecayCursor?.processedCheckpoints;
  let decayCursor: RankState['decayCursor'];

  if (
    typeof cursorAnchorTimestamp === 'number' &&
    typeof cursorProcessedCheckpoints === 'number' &&
    Number.isSafeInteger(cursorAnchorTimestamp) &&
    Number.isSafeInteger(cursorProcessedCheckpoints) &&
    Number.isFinite(new Date(cursorAnchorTimestamp).getTime()) &&
    cursorAnchorTimestamp === expectedAnchorTimestamp &&
    cursorProcessedCheckpoints >= 0 &&
    cursorProcessedCheckpoints <= maximumProcessedCheckpoints
  ) {
    const nextCheckpointTimestamp = getCheckpointTimestamp(
      cursorAnchorTimestamp,
      cursorProcessedCheckpoints + 1
    );
    if (Number.isFinite(new Date(nextCheckpointTimestamp).getTime())) {
      decayCursor = {
        anchorTimestamp: cursorAnchorTimestamp,
        processedCheckpoints: cursorProcessedCheckpoints,
      };
    }
  }

  return {
    ...normalizedBaseState,
    ...(decayCursor ? { decayCursor } : {}),
  };
}

export function totalRankXp(state: RankState) {
  const total = Object.values(state.events).reduce(
    (sum, event) => sum + normalizeEventXp(event.kind, event.xp),
    0
  );
  return Math.max(0, total);
}

export function claimRankEvent(state: RankState, event: RankXpEvent | null | undefined): RankState {
  if (!event || state.events[event.id]) {
    return state;
  }

  const xp = normalizeEventXp(event.kind, event.xp);
  if (xp === 0) {
    return state;
  }

  return {
    ...state,
    events: {
      ...state.events,
      [event.id]: {
        ...event,
        xp,
      },
    },
  };
}

export function getRankInactivityStatus(state: RankState, now = new Date()): RankInactivityStatus {
  const parsedNowTimestamp = now.getTime();
  const nowTimestamp = Number.isFinite(parsedNowTimestamp) ? parsedNowTimestamp : Date.now();
  const anchorTimestamp = getInactivityAnchor(state, nowTimestamp);
  const dueCheckpointCount = getDueCheckpointCount(anchorTimestamp, nowTimestamp);
  const processedCheckpoints = getProcessedCheckpointCount(state, anchorTimestamp);
  const nextCheckpoint = processedCheckpoints + 1;
  const pendingCheckpoints = Math.max(0, dueCheckpointCount - processedCheckpoints);

  const currentXp = totalRankXp(state);
  const nextCheckpointTimestamp = getCheckpointTimestamp(anchorTimestamp, nextCheckpoint);
  const nextDecayAt = currentXp > 0 ? new Date(nextCheckpointTimestamp).toISOString() : null;
  const daysUntilNextDecay = nextDecayAt
    ? Math.max(0, Math.ceil((nextCheckpointTimestamp - nowTimestamp) / DAY_IN_MS))
    : 0;

  return {
    lastCoreActivityAt: new Date(anchorTimestamp).toISOString(),
    protectionEndsAt: new Date(getCheckpointTimestamp(anchorTimestamp, 1)).toISOString(),
    nextDecayAt,
    inactiveDays: Math.max(0, Math.floor((nowTimestamp - anchorTimestamp) / DAY_IN_MS)),
    daysUntilNextDecay,
    pendingCheckpoints,
    isProtected: nowTimestamp < getCheckpointTimestamp(anchorTimestamp, 1),
    currentXp,
    nextDecayXp: calculateInactivityDecayXp(currentXp),
  };
}

export function applyRankInactivityDecay(state: RankState, now = new Date()): RankState {
  const parsedNowTimestamp = now.getTime();
  const nowTimestamp = Number.isFinite(parsedNowTimestamp) ? parsedNowTimestamp : Date.now();
  const anchorTimestamp = getInactivityAnchor(state, nowTimestamp);
  const dueCheckpointCount = getDueCheckpointCount(anchorTimestamp, nowTimestamp);
  const processedCheckpoints = getProcessedCheckpointCount(state, anchorTimestamp);
  let nextState = state;

  for (let checkpoint = processedCheckpoints + 1; checkpoint <= dueCheckpointCount; checkpoint += 1) {
    const eventId = getDecayEventId(anchorTimestamp, checkpoint);
    if (nextState.events[eventId]) {
      continue;
    }

    const currentXp = totalRankXp(nextState);
    const decayXp = calculateInactivityDecayXp(currentXp);
    if (decayXp === 0) {
      continue;
    }

    const checkpointTimestamp = getCheckpointTimestamp(anchorTimestamp, checkpoint);
    const checkpointDate = new Date(checkpointTimestamp);
    nextState = claimRankEvent(nextState, {
      id: eventId,
      kind: 'inactivity-decay',
      xp: -decayXp,
      dateKey: getLocalDateKey(checkpointDate),
      sourceId: `inactivity:${anchorTimestamp}`,
      awardedAt: checkpointDate.toISOString(),
    });
  }

  const nextProcessedCheckpoints = Math.max(processedCheckpoints, dueCheckpointCount);
  if (
    nextState.decayCursor?.anchorTimestamp !== anchorTimestamp ||
    nextState.decayCursor.processedCheckpoints !== nextProcessedCheckpoints
  ) {
    nextState = {
      ...nextState,
      decayCursor: {
        anchorTimestamp,
        processedCheckpoints: nextProcessedCheckpoints,
      },
    };
  }

  return nextState;
}

export function calculateWorkoutXp(completedSets: number, plannedSetCount: number) {
  const planned = normalizeXp(plannedSetCount);
  const completed = Math.min(planned, normalizeXp(completedSets));

  if (planned === 0) {
    return 0;
  }

  const completionRatio = completed / planned;
  if (completionRatio < 0.6) {
    return 0;
  }

  return Math.round(100 * Math.min(1, completionRatio));
}

export function getRankEventId(kind: RankXpKind, dateKey: string) {
  if (!parseDateKey(dateKey)) {
    throw new Error(`Data inválida para evento de rank: ${dateKey}`);
  }

  return kind === 'progress-checkin' ? `progress:${getIsoWeekKey(dateKey)}` : `${kind}:${dateKey}`;
}

export function createRankEvent(input: RankEventInput): RankXpEvent | null {
  if (!parseDateKey(input.dateKey)) {
    return null;
  }

  const xp =
    input.kind === 'workout'
      ? calculateWorkoutXp(input.completedSets, input.plannedSetCount)
      : RANK_XP[input.kind];

  if (xp <= 0) {
    return null;
  }

  return {
    id: getRankEventId(input.kind, input.dateKey),
    kind: input.kind,
    xp,
    dateKey: input.dateKey,
    sourceId: input.sourceId,
    awardedAt: input.awardedAt ?? new Date().toISOString(),
  };
}

export function getRankLevel(xp: number): RankLevel {
  const normalizedXp = normalizeXp(xp);

  for (let index = RANK_LEVELS.length - 1; index >= 0; index -= 1) {
    const level = RANK_LEVELS[index];
    if (normalizedXp >= level.minXp) {
      return level;
    }
  }

  return RANK_LEVELS[0];
}

export function getRankProgress(xp: number): RankProgress {
  const totalXp = normalizeXp(xp);
  const current = getRankLevel(totalXp);
  const currentIndex = RANK_LEVELS.findIndex((level) => level.id === current.id);
  const next = RANK_LEVELS[currentIndex + 1] ?? null;
  const xpIntoLevel = totalXp - current.minXp;

  if (!next) {
    return {
      current,
      next: null,
      totalXp,
      xpIntoLevel,
      xpToNext: 0,
      percent: 100,
    };
  }

  const levelSpan = next.minXp - current.minXp;
  return {
    current,
    next,
    totalXp,
    xpIntoLevel,
    xpToNext: next.minXp - totalXp,
    percent: Math.min(100, Math.floor((xpIntoLevel / levelSpan) * 100)),
  };
}

export function getDivisionRoman(division: RankDivision) {
  return ROMAN_DIVISIONS[division];
}

export function formatRankName(level: Pick<RankLevel, 'label' | 'division'>) {
  return `${level.label} ${getDivisionRoman(level.division)}`;
}
