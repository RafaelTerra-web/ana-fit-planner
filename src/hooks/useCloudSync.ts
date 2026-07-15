import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/authContext';
import { supabase } from '../lib/supabase';
import { clearCloudPendingMarker, markCloudDataPending, readCloudPendingMarker } from '../lib/storage';

export type CloudSyncStatus = 'saved' | 'saving' | 'offline' | 'error';

export function useCloudSync(data: unknown) {
  const { user } = useAuth();
  const [status, setStatus] = useState<CloudSyncStatus>(navigator.onLine ? 'saved' : 'offline');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const latestDataRef = useRef(data);
  const lastUploadedRef = useRef('');
  const uploadQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));

  latestDataRef.current = data;

  const upload = useCallback(() => {
    const performUpload = async () => {
      if (!supabase) return false;
      if (!navigator.onLine) {
        setStatus('offline');
        return false;
      }

      const dataToUpload = latestDataRef.current;
      const serialized = JSON.stringify(dataToUpload);
      const currentMarker = readCloudPendingMarker();
      if (serialized === lastUploadedRef.current && currentMarker?.ownerId !== user.id) {
        setStatus('saved');
        return true;
      }

      const uploadVersion = currentMarker?.ownerId === user.id ? currentMarker.version : markCloudDataPending(user.id);
      setStatus('saving');
      const { error } = await supabase.from('user_app_data').upsert({ user_id: user.id, data: dataToUpload });
      if (error) {
        setStatus(navigator.onLine ? 'error' : 'offline');
        return false;
      }

      lastUploadedRef.current = serialized;
      clearCloudPendingMarker(uploadVersion);
      setLastSyncedAt(new Date().toISOString());
      setStatus('saved');
      return true;
    };

    const queuedUpload = uploadQueueRef.current.then(performUpload, performUpload);
    uploadQueueRef.current = queuedUpload;
    return queuedUpload;
  }, [user.id]);

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
