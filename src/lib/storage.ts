export const APP_STORAGE_KEY = 'ana-fit-planner:data:v5';
export const LEGACY_APP_STORAGE_KEY = 'ana-fit-planner:data:v4';
export const CLOUD_OWNER_STORAGE_KEY = 'ana-fit-planner:cloud-owner:v1';
export const CLOUD_PENDING_STORAGE_KEY = 'ana-fit-planner:cloud-pending:v1';
const UNCLAIMED_STORAGE_PREFIX = 'ana-fit-planner:unclaimed';

export type StoredAppData = {
  data: unknown;
  source: string;
};

export function getUserAppStorageKey(userId: string, legacy = false) {
  return `${legacy ? LEGACY_APP_STORAGE_KEY : APP_STORAGE_KEY}:user:${userId}`;
}

export function resolveLocalStorageKey(key: string, userId?: string) {
  if (typeof window === 'undefined' || (key !== APP_STORAGE_KEY && key !== LEGACY_APP_STORAGE_KEY)) {
    return key;
  }

  const ownerId = userId ?? window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);
  return ownerId ? getUserAppStorageKey(ownerId, key === LEGACY_APP_STORAGE_KEY) : key;
}

function readFirstStoredValue(keys: string[]): StoredAppData | null {
  for (const key of keys) {
    try {
      const value = window.localStorage.getItem(key);
      if (value) {
        return { data: JSON.parse(value) as unknown, source: key };
      }
    } catch {
      // Keep looking for a valid local copy.
    }
  }

  return null;
}

export function readStoredAppData(userId?: string, includeSharedCopy = true): StoredAppData | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const keys = userId
    ? [getUserAppStorageKey(userId), getUserAppStorageKey(userId, true)]
    : [];
  const activeOwner = window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);

  if (includeSharedCopy && (!userId || !activeOwner || activeOwner === userId)) {
    keys.push(APP_STORAGE_KEY, LEGACY_APP_STORAGE_KEY);
  }

  return readFirstStoredValue(keys);
}

export function writeStoredAppData(data: unknown, userId?: string) {
  const ownerId = userId ?? window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);
  const key = ownerId ? getUserAppStorageKey(ownerId) : APP_STORAGE_KEY;
  window.localStorage.setItem(key, JSON.stringify(data));
}

function getUserCloudPendingStorageKey(ownerId: string) {
  return `${CLOUD_PENDING_STORAGE_KEY}:user:${ownerId}`;
}

export function markCloudDataPending(ownerId: string) {
  const version = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(getUserCloudPendingStorageKey(ownerId), JSON.stringify({ ownerId, version }));
  return version;
}

function readCloudPendingMarkerFromKey(key: string): { ownerId: string; version: string } | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? 'null') as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'ownerId' in parsed &&
      'version' in parsed &&
      typeof parsed.ownerId === 'string' &&
      typeof parsed.version === 'string'
    ) {
      return { ownerId: parsed.ownerId, version: parsed.version };
    }
  } catch {
    // Invalid markers are ignored; the app data itself remains untouched.
  }

  return null;
}

export function readCloudPendingMarker(ownerId?: string): { ownerId: string; version: string } | null {
  const activeOwner = ownerId ?? window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);
  if (activeOwner) {
    const scopedMarker = readCloudPendingMarkerFromKey(getUserCloudPendingStorageKey(activeOwner));
    if (scopedMarker) return scopedMarker;
  }

  return readCloudPendingMarkerFromKey(CLOUD_PENDING_STORAGE_KEY);
}

export function clearCloudPendingMarker(version?: string, ownerId?: string) {
  const activeOwner = ownerId ?? window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);
  const keys = activeOwner
    ? [getUserCloudPendingStorageKey(activeOwner), CLOUD_PENDING_STORAGE_KEY]
    : [CLOUD_PENDING_STORAGE_KEY];

  for (const key of keys) {
    const current = readCloudPendingMarkerFromKey(key);
    if (!version || current?.version === version) {
      window.localStorage.removeItem(key);
    }
  }
}

export function preserveDataFromAnotherAccount(ownerId: string) {
  const pendingMarker = readCloudPendingMarker(ownerId);
  for (const key of [APP_STORAGE_KEY, LEGACY_APP_STORAGE_KEY] as const) {
    const current = window.localStorage.getItem(key);
    if (current) {
      const userKey = getUserAppStorageKey(ownerId, key === LEGACY_APP_STORAGE_KEY);
      if (pendingMarker?.ownerId === ownerId || !window.localStorage.getItem(userKey)) {
        window.localStorage.setItem(userKey, current);
      }
    }
  }

  if (pendingMarker?.ownerId === ownerId) {
    markCloudDataPending(ownerId);
  }

  clearSharedStoredAppData();
}

export function clearSharedStoredAppData() {
  window.localStorage.removeItem(APP_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_APP_STORAGE_KEY);
  window.localStorage.removeItem(CLOUD_PENDING_STORAGE_KEY);
}

export function preserveUnclaimedStoredData() {
  const suffix = Date.now().toString(36);
  let preserved = false;

  for (const key of [APP_STORAGE_KEY, LEGACY_APP_STORAGE_KEY] as const) {
    const current = window.localStorage.getItem(key);
    if (current) {
      window.localStorage.setItem(`${UNCLAIMED_STORAGE_PREFIX}:${suffix}:${key}`, current);
      preserved = true;
    }
  }

  clearSharedStoredAppData();
  return preserved;
}
