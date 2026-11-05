import type { User } from '@supabase/supabase-js';
import { CLOUD_OWNER_STORAGE_KEY, readStoredAppData } from './storage';

const OFFLINE_USER_KEY = 'ana-fit-planner:offline-user:v1';
const OFFLINE_DISABLED_KEY = 'ana-fit-planner:offline-disabled:v1';

export function rememberOfflineUser(user: User) {
  // This identity only opens this device's cache. Cloud access still uses Auth + RLS.
  window.localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify({
    id: user.id, email: user.email, user_metadata: user.user_metadata,
    app_metadata: user.app_metadata, aud: user.aud, created_at: user.created_at,
  }));
  window.localStorage.removeItem(OFFLINE_DISABLED_KEY);
}

export function forgetOfflineUser() {
  window.localStorage.removeItem(OFFLINE_USER_KEY);
  window.localStorage.setItem(OFFLINE_DISABLED_KEY, 'true');
}

export function readOfflineUser(authStorageKey: string): User | null {
  try {
    if (window.localStorage.getItem(OFFLINE_DISABLED_KEY) === 'true') return null;
    const remembered = JSON.parse(window.localStorage.getItem(OFFLINE_USER_KEY) ?? 'null');
    const session = JSON.parse(window.localStorage.getItem(authStorageKey) ?? 'null');
    const user = session?.user ?? remembered;
    const owner = window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);
    if (!user || typeof user.id !== 'string' || user.id !== owner || user.user_metadata?.force_password_change === true) return null;
    const stored = readStoredAppData(user.id, false)?.data;
    if (!stored || typeof stored !== 'object' || !('profile' in stored)) return null;
    return user as User;
  } catch {
    return null;
  }
}
