import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/authContext';
import { supabase } from '../lib/supabase';
import {
  completeCloudUpload,
  markCloudDataPending,
  readCloudPendingMarker,
} from '../lib/storage';

export type CloudSyncStatus = 'local' | 'saved' | 'saving' | 'offline' | 'error';

export function useCloudSync(data: unknown, enabled = true) {
  const { user, cloudEnabled } = useAuth();
  const userId = user?.id;
  const [status, setStatus] = useState<CloudSyncStatus>(() =>
    cloudEnabled ? (navigator.onLine ? 'saved' : 'offline') : 'local'
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const latestDataRef = useRef(data);
  const lastUploadedRef = useRef('');
  const uploadQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));

  latestDataRef.current = data;

  const upload = useCallback(() => {
    const performUpload = async () => {
      if (!enabled) return false;
      if (!supabase || !userId) return false;
      if (!navigator.onLine) {
        setStatus('offline');
        return false;
      }

      const dataToUpload = latestDataRef.current;
      const serialized = JSON.stringify(dataToUpload);
      const currentMarker = readCloudPendingMarker(userId);
      if (serialized === lastUploadedRef.current && currentMarker?.ownerId !== userId) {
        setStatus('saved');
        return true;
      }

      const uploadVersion = currentMarker?.ownerId === userId ? currentMarker.version : markCloudDataPending(userId);
      const pendingMarker = readCloudPendingMarker(userId);
      setStatus('saving');

      if (!pendingMarker?.baseUpdatedAt) {
        const { data: remoteRow, error: versionError } = await supabase
          .from('anfit_user_app_data')
          .select('data,updated_at')
          .eq('user_id', userId)
          .maybeSingle();
        if (versionError) {
          setStatus(navigator.onLine ? 'error' : 'offline');
          return false;
        }
        if (remoteRow && JSON.stringify(remoteRow.data) === serialized && typeof remoteRow.updated_at === 'string') {
          completeCloudUpload(userId, uploadVersion, remoteRow.updated_at);
          lastUploadedRef.current = serialized;
          setLastSyncedAt(new Date().toISOString());
          setStatus('saved');
          return true;
        }

        setStatus('error');
        return false;
      }

      const { data: updatedRow, error } = await supabase
        .from('anfit_user_app_data')
        .update({ data: dataToUpload })
        .eq('user_id', userId)
        .eq('updated_at', pendingMarker.baseUpdatedAt)
        .select('data,updated_at')
        .maybeSingle();
      if (error) {
        setStatus(navigator.onLine ? 'error' : 'offline');
        return false;
      }
      if (!updatedRow || typeof updatedRow.updated_at !== 'string') {
        setStatus('error');
        return false;
      }

      lastUploadedRef.current = JSON.stringify(updatedRow.data);
      completeCloudUpload(userId, uploadVersion, updatedRow.updated_at);
      setLastSyncedAt(new Date().toISOString());
      setStatus('saved');
      return true;
    };

    const queuedUpload = uploadQueueRef.current.then(performUpload, performUpload);
    uploadQueueRef.current = queuedUpload;
    return queuedUpload;
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => void upload(), 800);
    return () => window.clearTimeout(timer);
  }, [data, enabled, upload]);

  useEffect(() => {
    if (!enabled) return;
    const handleOnline = () => void upload();
    const handleOffline = () => setStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, upload]);

  return { status, lastSyncedAt, retry: upload };
}
