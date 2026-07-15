import type { User } from '@supabase/supabase-js';
import { CheckCircle2, Cloud, Dumbbell, Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, Mail } from 'lucide-react';
import { type FormEvent, type PropsWithChildren, useEffect, useState } from 'react';
import { AuthContext, type ForgetAfterDays, type MigrationResult } from './authContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  APP_STORAGE_KEY,
  clearCloudPendingMarker,
  CLOUD_OWNER_STORAGE_KEY,
  preserveDataFromAnotherAccount,
  readCloudPendingMarker,
  readStoredAppData,
  writeStoredAppData,
} from '../lib/storage';

const FORGET_AFTER_STORAGE_KEY = 'ana-fit-planner:forget-after-days:v1';
const LAST_ACTIVITY_STORAGE_KEY = 'ana-fit-planner:last-activity:v1';

function readForgetAfterDays(): ForgetAfterDays {
  const value = window.localStorage.getItem(FORGET_AFTER_STORAGE_KEY);
  return value === '7' || value === '30' || value === '90' ? Number(value) as 7 | 30 | 90 : null;
}

function sessionExpired() {
  const days = readForgetAfterDays();
  const lastActivity = Number(window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY));
  return Boolean(days && lastActivity && Date.now() - lastActivity > days * 24 * 60 * 60 * 1_000);
}

function recordActivity() {
  window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(Date.now()));
}

function AuthShell({ children }: PropsWithChildren) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-lime-200/25 bg-lime-300 text-slate-950 shadow-[0_0_35px_rgba(190,242,100,0.2)]">
            <Dumbbell size={25} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">Ana Fit</p>
            <p className="text-lg font-black tracking-tight text-white">Seu treino, sempre com você</p>
          </div>
        </div>
        <section className="premium-card rounded-[1.6rem] border border-white/10 bg-slate-900/90 p-5 shadow-soft sm:p-6">
          {children}
        </section>
      </div>
    </main>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <AuthShell>
      <div className="flex min-h-56 flex-col items-center justify-center text-center">
        <LoaderCircle className="animate-spin text-lime-300" size={34} aria-hidden="true" />
        <h1 className="mt-5 text-xl font-black text-white">Preparando seu espaço</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{message}</p>
      </div>
    </AuthShell>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block space-y-1.5 text-sm font-semibold text-slate-200" htmlFor={id}>
      <span>{label}</span>
      <span className="relative block">
        <input
          className="input pr-12"
          style={{ paddingRight: '3rem' }}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
        />
        <button
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setMessage('');

    if (resetMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      setBusy(false);
      setMessage(error ? 'Não foi possível enviar o e-mail. Confira o endereço e tente novamente.' : 'Confira sua caixa de entrada para criar uma nova senha.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setMessage('E-mail ou senha incorretos. Tente novamente.');
    }
  };

  return (
    <AuthShell>
      <p className="eyebrow">Acesso protegido</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-white">{resetMode ? 'Recuperar acesso' : 'Bem-vinda de volta'}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {resetMode ? 'Enviaremos um link seguro para você escolher outra senha.' : 'Entre para carregar treinos, progresso e rank em qualquer dispositivo.'}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1.5 text-sm font-semibold text-slate-200" htmlFor="login-email">
          <span>E-mail</span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} aria-hidden="true" />
            <input
              className="input pl-10"
              style={{ paddingLeft: '2.5rem' }}
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="seuemail@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </span>
        </label>
        {!resetMode ? (
          <PasswordField id="login-password" label="Senha" value={password} onChange={setPassword} autoComplete="current-password" />
        ) : null}
        {message ? <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-relaxed text-slate-300" role="status">{message}</p> : null}
        <button className="primary-button w-full" type="submit" disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" size={19} aria-hidden="true" /> : resetMode ? <Mail size={19} aria-hidden="true" /> : <LogIn size={19} aria-hidden="true" />}
          {busy ? 'Aguarde...' : resetMode ? 'Enviar link seguro' : 'Entrar'}
        </button>
      </form>

      <button className="mt-4 w-full text-sm font-bold text-lime-300" type="button" onClick={() => { setResetMode((current) => !current); setMessage(''); }}>
        {resetMode ? 'Voltar para o login' : 'Esqueci minha senha'}
      </button>
    </AuthShell>
  );
}

function SetPasswordScreen({ user, onComplete }: { user: User; onComplete: (user: User) => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    if (password.length < 8) {
      setMessage('Use pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setMessage('As senhas não coincidem.');
      return;
    }

    setBusy(true);
    setMessage('');
    const { data, error } = await supabase.auth.updateUser({
      password,
      data: { ...user.user_metadata, force_password_change: false, display_name: user.user_metadata.display_name ?? 'Ana' },
    });
    setBusy(false);

    if (error || !data.user) {
      setMessage('Não foi possível salvar a senha. Tente novamente.');
      return;
    }

    onComplete(data.user);
  };

  return (
    <AuthShell>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300">
        <LockKeyhole size={24} aria-hidden="true" />
      </span>
      <p className="eyebrow mt-5">Primeiro acesso</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-white">Crie sua nova senha</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Antes de abrir o app, proteja seus dados com uma senha pessoal de pelo menos 8 caracteres.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <PasswordField id="new-password" label="Nova senha" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField id="confirm-password" label="Confirmar nova senha" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <CheckCircle2 className={password.length >= 8 ? 'text-lime-300' : 'text-slate-600'} size={16} aria-hidden="true" />
          Mínimo de 8 caracteres
        </div>
        {message ? <p className="text-sm font-semibold text-rose-300" role="alert">{message}</p> : null}
        <button className="primary-button w-full" type="submit" disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" size={19} aria-hidden="true" /> : <LockKeyhole size={19} aria-hidden="true" />}
          {busy ? 'Protegendo conta...' : 'Criar senha e continuar'}
        </button>
      </form>
    </AuthShell>
  );
}

async function prepareUserData(userId: string): Promise<MigrationResult> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: remoteRow, error } = await supabase.from('user_app_data').select('data').eq('user_id', userId).maybeSingle();
  if (error) throw error;

  const previousOwner = window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);
  if (previousOwner && previousOwner !== userId) {
    preserveDataFromAnotherAccount(previousOwner);
  }

  const localCopy = readStoredAppData();
  const pendingMarker = readCloudPendingMarker();

  if (pendingMarker?.ownerId === userId && localCopy) {
    const { error: pendingUploadError } = await supabase.from('user_app_data').upsert({ user_id: userId, data: localCopy.data });
    if (pendingUploadError) throw pendingUploadError;

    if (localCopy.source !== APP_STORAGE_KEY) {
      writeStoredAppData(localCopy.data);
    }
    clearCloudPendingMarker(pendingMarker.version);
    window.localStorage.setItem(CLOUD_OWNER_STORAGE_KEY, userId);
    return 'uploaded';
  }

  if (remoteRow?.data) {
    writeStoredAppData(remoteRow.data);
    clearCloudPendingMarker();
    window.localStorage.setItem(CLOUD_OWNER_STORAGE_KEY, userId);
    return 'downloaded';
  }

  if (localCopy) {
    const { error: uploadError } = await supabase.from('user_app_data').upsert({ user_id: userId, data: localCopy.data });
    if (uploadError) throw uploadError;

    if (localCopy.source !== APP_STORAGE_KEY) {
      writeStoredAppData(localCopy.data);
    }
    clearCloudPendingMarker();
    window.localStorage.setItem(CLOUD_OWNER_STORAGE_KEY, userId);
    return 'uploaded';
  }

  window.localStorage.setItem(CLOUD_OWNER_STORAGE_KEY, userId);
  return 'empty';
}

export function AuthGate({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [stage, setStage] = useState<'loading' | 'login' | 'password' | 'preparing' | 'ready' | 'error'>('loading');
  const [migrationResult, setMigrationResult] = useState<MigrationResult>('empty');
  const [forgetAfterDays, setForgetAfterDaysState] = useState<ForgetAfterDays>(readForgetAfterDays);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;

    const routeUser = (nextUser: User | null, recovery = false) => {
      if (!active) return;

      if (nextUser && sessionExpired()) {
        window.localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
        void client.auth.signOut({ scope: 'local' });
        setUser(null);
        setStage('login');
        return;
      }

      setUser(nextUser);
      if (!nextUser) {
        setStage('login');
      } else if (recovery || nextUser.user_metadata.force_password_change === true) {
        recordActivity();
        setStage('password');
      } else {
        recordActivity();
        setStage('preparing');
      }
    };

    client.auth.getSession().then(({ data }) => routeUser(data.session?.user ?? null));
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      routeUser(session?.user ?? null, event === 'PASSWORD_RECOVERY');
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!user || stage === 'login' || !client) return;
    let lastRecordedAt = 0;

    const handleActivity = () => {
      if (sessionExpired()) {
        void client.auth.signOut({ scope: 'local' });
        return;
      }

      if (Date.now() - lastRecordedAt > 60_000) {
        lastRecordedAt = Date.now();
        recordActivity();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleActivity();
    };

    window.addEventListener('focus', handleActivity);
    window.addEventListener('pointerdown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [stage, user]);

  useEffect(() => {
    if (stage !== 'preparing' || !user) return;
    let active = true;

    prepareUserData(user.id)
      .then((result) => {
        if (!active) return;
        setMigrationResult(result);
        setStage('ready');
      })
      .catch(() => {
        if (active) setStage('error');
      });

    return () => {
      active = false;
    };
  }, [stage, user]);

  if (!isSupabaseConfigured) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          cloudEnabled: false,
          migrationResult: 'empty',
          forgetAfterDays,
          setForgetAfterDays: (days) => {
            setForgetAfterDaysState(days);
            if (days) {
              window.localStorage.setItem(FORGET_AFTER_STORAGE_KEY, String(days));
            } else {
              window.localStorage.removeItem(FORGET_AFTER_STORAGE_KEY);
            }
          },
          signOut: async () => undefined,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }
  if (stage === 'loading') return <LoadingScreen message="Validando sua sessão segura..." />;
  if (stage === 'login' || !user) return <LoginScreen />;
  if (stage === 'password') return <SetPasswordScreen user={user} onComplete={(updatedUser) => { setUser(updatedUser); setStage('preparing'); }} />;
  if (stage === 'preparing') return <LoadingScreen message="Sincronizando os dados deste aparelho com sua conta..." />;
  if (stage === 'error') {
    return (
      <AuthShell>
        <Cloud className="text-rose-300" size={30} aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-black text-white">Não foi possível sincronizar</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">Seus dados locais continuam preservados. Verifique a conexão e tente novamente.</p>
        <button className="primary-button mt-6 w-full" type="button" onClick={() => setStage('preparing')}>Tentar novamente</button>
      </AuthShell>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        cloudEnabled: true,
        migrationResult,
        forgetAfterDays,
        setForgetAfterDays: (days) => {
          setForgetAfterDaysState(days);
          if (days) {
            window.localStorage.setItem(FORGET_AFTER_STORAGE_KEY, String(days));
          } else {
            window.localStorage.removeItem(FORGET_AFTER_STORAGE_KEY);
          }
          recordActivity();
        },
        signOut: async () => {
          if (supabase) await supabase.auth.signOut({ scope: 'local' });
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
