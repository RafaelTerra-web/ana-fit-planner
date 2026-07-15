import { useEffect, useState } from 'react';
import { APP_STORAGE_KEY, CLOUD_OWNER_STORAGE_KEY, markCloudDataPending } from '../lib/storage';

type InitialValue<T> = T | (() => T);

function resolveInitialValue<T>(initialValue: InitialValue<T>) {
  return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
}

export function useLocalStorage<T>(key: string, initialValue: InitialValue<T>) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return resolveInitialValue(initialValue);
    }

    try {
      const storedValue = window.localStorage.getItem(key);
      return storedValue ? (JSON.parse(storedValue) as T) : resolveInitialValue(initialValue);
    } catch {
      return resolveInitialValue(initialValue);
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      const ownerId = window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);
      if (key === APP_STORAGE_KEY && ownerId) {
        markCloudDataPending(ownerId);
      }
    } catch {
      // LocalStorage can fail in private mode. The app still works for the current session.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
