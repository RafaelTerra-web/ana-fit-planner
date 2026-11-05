import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/authContext';
import { supabase } from '../lib/supabase';
import { mergeCloudData, withCloudNutrition, type ConflictChoice } from '../lib/cloudMerge';
import { jsonValuesAreEqual } from '../utils/json';
import {
  CLOUD_OWNER_STORAGE_KEY, completeCloudUpload, markCloudDataPending, notifyAppDataUpdated,
  preserveSyncConflict, readCloudBase, readCloudPendingMarker, readCloudSyncVersion,
  writeCloudBase, writeStoredAppData,
} from '../lib/storage';

export type CloudSyncStatus = 'local' | 'saved' | 'saving' | 'offline' | 'error' | 'conflict' | 'auth-required';

export function useCloudSync(data: unknown, enabled = true) {
  const { user, cloudEnabled } = useAuth();
  const userId = user?.id;
  const [status, setStatus] = useState<CloudSyncStatus>(cloudEnabled ? 'offline' : 'local');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const latestDataRef = useRef(data);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const mountedRef = useRef(true);
  latestDataRef.current = data;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const upload = useCallback((choice?: ConflictChoice): Promise<boolean> => {
    if (inFlightRef.current) return inFlightRef.current;
    const run = async () => {
      const client = supabase;
      if (!enabled || !cloudEnabled || !client || !userId) return false;
      const isCurrent = () => mountedRef.current && window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY) === userId;
      const updateStatus = (next: CloudSyncStatus) => { if (isCurrent()) setStatus(next); };
      if (!navigator.onLine) { updateStatus('offline'); return false; }
      try {
        const { data: auth, error: authError } = await client.auth.getUser();
        if (!isCurrent()) return false;
        if (authError || auth.user?.id !== userId) {
          updateStatus(authError && (authError.status === 0 || (authError.status ?? 0) >= 500) ? 'error' : 'auth-required');
          return false;
        }

        // Compare-and-swap retries handle another device writing during this request.
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const { data: remote, error } = await client.from('anfit_user_app_data')
            .select('data,updated_at').eq('user_id', userId).maybeSingle();
          if (error) throw error;
          if (!isCurrent()) return false;
          const local = latestDataRef.current;
          const marker = readCloudPendingMarker(userId);
          const version = marker?.baseUpdatedAt ?? readCloudSyncVersion(userId);
          const base = readCloudBase(userId);
          let merged: unknown = local;
          if (!remote && version) {
            updateStatus('conflict');
            return false;
          }
          if (remote) {
            if (typeof remote.updated_at !== 'string') throw new Error('Missing remote version');
            const plan = remote.data?.assignedNutritionPlan;
            if (plan && (plan.id !== auth.user.app_metadata.assigned_nutrition_plan_id ||
              plan.revision !== auth.user.app_metadata.assigned_nutrition_plan_revision ||
              plan.assignedAt !== auth.user.app_metadata.assigned_nutrition_plan_assigned_at)) {
              throw new Error('Assigned nutrition metadata changed; retry after token refresh');
            }
            if (!plan && local && typeof local === 'object' && 'assignedNutritionPlan' in local && local.assignedNutritionPlan) {
              throw new Error('Local assigned nutrition has no authoritative cloud copy');
            }
            if (jsonValuesAreEqual(local, remote.data)) {
              merged = remote.data;
            } else if (!marker && version) {
              merged = remote.data;
            } else if (version === remote.updated_at) {
              merged = withCloudNutrition(local, remote.data);
            } else {
              const original = base?.updatedAt === version ? base.data : undefined;
              const result = mergeCloudData(
                withCloudNutrition(original, remote.data), withCloudNutrition(local, remote.data), remote.data, choice,
              );
              if (result.conflicts.length && !choice) {
                preserveSyncConflict(userId, local, remote.data);
                updateStatus('conflict');
                return false;
              }
              if (result.conflicts.length) preserveSyncConflict(userId, local, remote.data);
              merged = result.data;
            }
          }

          const uploadVersion = marker?.version ?? `clean:${Date.now()}`;
          let saved = remote;
          if (!remote || !jsonValuesAreEqual(merged, remote.data)) {
            if (!marker) markCloudDataPending(userId);
            updateStatus('saving');
            const query = remote
              ? client.from('anfit_user_app_data').update({ data: merged }).eq('user_id', userId).eq('updated_at', remote.updated_at)
              : client.from('anfit_user_app_data').insert({ user_id: userId, data: merged });
            const result = await query.select('data,updated_at').maybeSingle();
            if (result.error?.code === '23505') continue;
            if (result.error) throw result.error;
            if (!result.data) continue;
            saved = result.data;
          }
          if (!saved || !isCurrent()) return false;

          // Edits made while the request was in flight remain in the outbox.
          const current = latestDataRef.current;
          const applied = jsonValuesAreEqual(local, current) ? saved.data :
            withCloudNutrition(mergeCloudData(local, current, saved.data, 'local').data, saved.data);
          writeStoredAppData(applied, userId);
          writeCloudBase(userId, saved.data, saved.updated_at);
          const currentMarker = readCloudPendingMarker(userId);
          if (!marker && currentMarker && jsonValuesAreEqual(local, current)) {
            completeCloudUpload(userId, currentMarker.version, saved.updated_at);
          } else {
            completeCloudUpload(userId, uploadVersion, saved.updated_at);
          }
          latestDataRef.current = applied;
          if (!jsonValuesAreEqual(current, applied)) notifyAppDataUpdated(userId);
          setLastSyncedAt(new Date().toISOString());
          updateStatus(readCloudPendingMarker(userId) ? 'offline' : 'saved');
          return true;
        }
        updateStatus('conflict');
      } catch {
        updateStatus(navigator.onLine ? 'error' : 'offline');
      }
      return false;
    };
    const promise = run().finally(() => { inFlightRef.current = null; });
    inFlightRef.current = promise;
    return promise;
  }, [cloudEnabled, enabled, userId]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => void upload(), 800);
    return () => window.clearTimeout(timer);
  }, [data, enabled, upload]);

  useEffect(() => {
    if (!enabled || !cloudEnabled) return;
    const retry = () => { if (document.visibilityState === 'visible') void upload(); };
    const offline = () => setStatus('offline');
    const timer = window.setInterval(retry, 30_000);
    window.addEventListener('online', retry);
    window.addEventListener('offline', offline);
    window.addEventListener('focus', retry);
    document.addEventListener('visibilitychange', retry);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', retry);
      window.removeEventListener('offline', offline);
      window.removeEventListener('focus', retry);
      document.removeEventListener('visibilitychange', retry);
    };
  }, [cloudEnabled, enabled, upload]);

  return { status, lastSyncedAt, retry: () => upload(), resolveConflict: (choice: ConflictChoice) => upload(choice) };
}
