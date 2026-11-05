import { useEffect, useState } from 'react';
import { LOCAL_SAVE_EVENT } from '../lib/storage';

export function LocalSaveNotice() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const listener = (event: Event) => setFailed(!(event as CustomEvent<{ ok: boolean }>).detail.ok);
    window.addEventListener(LOCAL_SAVE_EVENT, listener);
    return () => window.removeEventListener(LOCAL_SAVE_EVENT, listener);
  }, []);
  return failed ? (
    <div className="mx-auto max-w-5xl rounded-2xl border border-amber-300/30 bg-amber-950 p-4 text-sm text-amber-100" role="alert">
      O aparelho não conseguiu guardar a última alteração. Libere espaço e exporte uma cópia em Ajustes antes de fechar o app.
    </div>
  ) : null;
}
