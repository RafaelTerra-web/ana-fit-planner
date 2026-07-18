import { useEffect, useState } from 'react';
import { useAuth } from '../auth/authContext';
import { APP_STORAGE_KEY, CLOUD_OWNER_STORAGE_KEY, markCloudDataPending, resolveLocalStorageKey } from '../lib/storage';

type InitialValue<T> = T | (() => T);

function resolveInitialValue<T>(initialValue: InitialValue<T>) {
  return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
}

export function useLocalStorage<T>(key: string, initialValue: InitialValue<T>) {
  const { user } = useAuth();
  const userId = user?.id;
  const storageKey = resolveLocalStorageKey(key, userId);
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return resolveInitialValue(initialValue);
    }

    try {
      const storedValue = window.localStorage.getItem(storageKey);
      return storedValue ? (JSON.parse(storedValue) as T) : resolveInitialValue(initialValue);
    } catch {
      return resolveInitialValue(initialValue);
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
      const ownerId = userId ?? window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);
      if (key === APP_STORAGE_KEY && ownerId) {
        markCloudDataPending(ownerId);
      }
    } catch {
      // LocalStorage can fail in private mode. The app still works for the current session.
    }
  }, [key, storageKey, userId, value]);

  return [value, setValue] as const;
}
