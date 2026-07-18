import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/authContext';
import { supabase } from '../lib/supabase';
import { clearCloudPendingMarker, markCloudDataPending, readCloudPendingMarker } from '../lib/storage';

export type CloudSyncStatus = 'local' | 'saved' | 'saving' | 'offline' | 'error';

export function useCloudSync(data: unknown) {
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
      setStatus('saving');
      const { error } = await supabase.from('anfit_user_app_data').upsert({ user_id: userId, data: dataToUpload });
      if (error) {
        setStatus(navigator.onLine ? 'error' : 'offline');
        return false;
      }

      lastUploadedRef.current = serialized;
      clearCloudPendingMarker(uploadVersion, userId);
      setLastSyncedAt(new Date().toISOString());
      setStatus('saved');
      return true;
    };

    const queuedUpload = uploadQueueRef.current.then(performUpload, performUpload);
    uploadQueueRef.current = queuedUpload;
    return queuedUpload;
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void upload(), 800);
    return () => window.clearTimeout(timer);
  }, [data, upload]);

  useEffect(() => {
    const handleOnline = () => void upload();
    const handleOffline = () => setStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [upload]);

  return { status, lastSyncedAt, retry: upload };
}
