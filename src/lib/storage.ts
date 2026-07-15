export const APP_STORAGE_KEY = 'ana-fit-planner:data:v5';
export const LEGACY_APP_STORAGE_KEY = 'ana-fit-planner:data:v4';
export const CLOUD_OWNER_STORAGE_KEY = 'ana-fit-planner:cloud-owner:v1';
export const CLOUD_PENDING_STORAGE_KEY = 'ana-fit-planner:cloud-pending:v1';

export type StoredAppData = {
  data: unknown;
  source: typeof APP_STORAGE_KEY | typeof LEGACY_APP_STORAGE_KEY;
};

export function readStoredAppData(): StoredAppData | null {
  if (typeof window === 'undefined') {
    return null;
  }

  for (const key of [APP_STORAGE_KEY, LEGACY_APP_STORAGE_KEY] as const) {
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

export function writeStoredAppData(data: unknown) {
  window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
}

export function markCloudDataPending(ownerId: string) {
  const version = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(CLOUD_PENDING_STORAGE_KEY, JSON.stringify({ ownerId, version }));
  return version;
}

export function readCloudPendingMarker(): { ownerId: string; version: string } | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CLOUD_PENDING_STORAGE_KEY) ?? 'null') as unknown;
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

export function clearCloudPendingMarker(version?: string) {
  const current = readCloudPendingMarker();
  if (!version || current?.version === version) {
    window.localStorage.removeItem(CLOUD_PENDING_STORAGE_KEY);
  }
}

export function preserveDataFromAnotherAccount(ownerId: string) {
  for (const key of [APP_STORAGE_KEY, LEGACY_APP_STORAGE_KEY] as const) {
    const current = window.localStorage.getItem(key);
    if (current) {
      window.localStorage.setItem(`${key}:${ownerId}`, current);
    }
  }

  window.localStorage.removeItem(APP_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_APP_STORAGE_KEY);
  window.localStorage.removeItem(CLOUD_PENDING_STORAGE_KEY);
}
