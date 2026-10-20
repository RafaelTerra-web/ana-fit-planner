import { useEffect, useState } from 'react';

export type ScreenAwakeStatus = 'off' | 'requesting' | 'on' | 'unavailable' | 'released';

// A wake lock belongs only to the visible training screen. Returning from another
// app requests a fresh sentinel; leaving the session releases it immediately.
export function useScreenAwake(enabled: boolean) {
  const [status, setStatus] = useState<ScreenAwakeStatus>('off');

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      return;
    }
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      setStatus('unavailable');
      return;
    }
    let disposed = false;
    let requesting = false;
    let sentinel: WakeLockSentinel | null = null;
    const acquire = async () => {
      if (disposed || requesting || sentinel || document.visibilityState !== 'visible') return;
      requesting = true;
      setStatus('requesting');
      try {
        const next = await navigator.wakeLock.request('screen');
        if (disposed || document.visibilityState !== 'visible') {
          void next.release().catch(() => undefined);
          return;
        }
        sentinel = next;
        setStatus('on');
        next.addEventListener(
          'release',
          () => {
            if (sentinel !== next) return;
            sentinel = null;
            if (!disposed) setStatus('released');
          },
          { once: true },
        );
      } catch {
        if (!disposed) setStatus('unavailable');
      } finally {
        requesting = false;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
      else if (sentinel) {
        const previous = sentinel;
        sentinel = null;
        void previous.release().catch(() => undefined);
      }
    };
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel) void sentinel.release().catch(() => undefined);
    };
  }, [enabled]);

  return status;
}
