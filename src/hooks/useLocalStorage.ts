import { type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/authContext';
import { APP_DATA_UPDATED_EVENT, APP_STORAGE_KEY, CLOUD_OWNER_STORAGE_KEY, LOCAL_SAVE_EVENT, markCloudDataPending, resolveLocalStorageKey } from '../lib/storage';

type InitialValue<T> = T | (() => T);

function resolveInitialValue<T>(initialValue: InitialValue<T>) {
  return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
}

export function useLocalStorage<T>(key: string, initialValue: InitialValue<T>) {
  const { user } = useAuth();
  const userId = user?.id;
  const storageKey = resolveLocalStorageKey(key, userId);
  const [value, updateValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) as T : resolveInitialValue(initialValue);
    } catch {
      return resolveInitialValue(initialValue);
    }
  });
  const valueRef = useRef(value);

  const persist = useCallback((next: T) => {
    try {
      const serialized = JSON.stringify(next);
      if (window.localStorage.getItem(storageKey) !== serialized) {
        const ownerId = userId ?? window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);
        // Persist the outbox first, so a closed tab cannot leave an unmarked edit.
        if (key === APP_STORAGE_KEY && ownerId) markCloudDataPending(ownerId);
        window.localStorage.setItem(storageKey, serialized);
      }
      window.dispatchEvent(new window.CustomEvent(LOCAL_SAVE_EVENT, { detail: { ok: true } }));
    } catch {
      window.dispatchEvent(new window.CustomEvent(LOCAL_SAVE_EVENT, { detail: { ok: false } }));
    }
  }, [key, storageKey, userId]);

  const setValue = useCallback((action: SetStateAction<T>) => {
    const next = typeof action === 'function' ? (action as (current: T) => T)(valueRef.current) : action;
    valueRef.current = next;
    // Save before returning from the interaction, including immediately before closing the PWA.
    persist(next);
    updateValue(next);
  }, [persist]);

  useEffect(() => persist(valueRef.current), [persist]);

  useEffect(() => {
    const restore = () => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          const next = JSON.parse(stored) as T;
          valueRef.current = next;
          updateValue(next);
        }
      } catch { /* Keep the current usable copy. */ }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) restore();
    };
    const handleSync = (event: Event) => {
      if ((event as CustomEvent<{ ownerId: string }>).detail.ownerId === userId) restore();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(APP_DATA_UPDATED_EVENT, handleSync);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(APP_DATA_UPDATED_EVENT, handleSync);
    };
  }, [storageKey, userId]);

  return [value, setValue] as const;
}
