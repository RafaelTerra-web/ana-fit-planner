import type { User } from '@supabase/supabase-js';
import { Activity, CheckCircle2, Cloud, Dumbbell, Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, Mail, ShieldCheck, Sparkles, Trophy, UserPlus, UserRound } from 'lucide-react';
import { type FormEvent, type PropsWithChildren, useEffect, useState } from 'react';
import { AuthContext, getUserDisplayName, type ForgetAfterDays, type MigrationResult } from './authContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { detachPushSubscriptionForCurrentUser } from '../utils/notifications';
import {
  APP_STORAGE_KEY,
  clearSharedStoredAppData,
  clearCloudPendingMarker,
  CLOUD_OWNER_STORAGE_KEY,
  getUserAppStorageKey,
  LEGACY_APP_STORAGE_KEY,
  preserveDataFromAnotherAccount,
  preserveUnclaimedStoredData,
  readCloudPendingMarker,
  readStoredAppData,
  writeStoredAppData,
} from '../lib/storage';

const FORGET_AFTER_STORAGE_KEY = 'ana-fit-planner:forget-after-days:v1';
const LAST_ACTIVITY_STORAGE_KEY = 'ana-fit-planner:last-activity:v1';

function accountSettingKey(key: string, userId?: string) {
  return userId ? `${key}:user:${userId}` : key;
}

function readAccountSetting(key: string, userId?: string, includeSharedValue = true) {
  const scopedValue = window.localStorage.getItem(accountSettingKey(key, userId));
  if (scopedValue !== null || !userId || !includeSharedValue) return scopedValue;

  const activeOwner = window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);
  return !activeOwner || activeOwner === userId ? window.localStorage.getItem(key) : null;
}

function readForgetAfterDays(userId?: string, includeSharedValue = true): ForgetAfterDays {
  const value = readAccountSetting(FORGET_AFTER_STORAGE_KEY, userId, includeSharedValue);
  return value === '7' || value === '30' || value === '90' ? Number(value) as 7 | 30 | 90 : null;
}

function sessionExpired(user: User) {
  const includeSharedValue = user.user_metadata?.created_via_anfit_signup !== true;
  const days = readForgetAfterDays(user.id, includeSharedValue);
  const lastActivity = Number(readAccountSetting(LAST_ACTIVITY_STORAGE_KEY, user.id, includeSharedValue));
  return Boolean(days && lastActivity && Date.now() - lastActivity > days * 24 * 60 * 60 * 1_000);
}

function recordActivity(userId?: string) {
  window.localStorage.setItem(accountSettingKey(LAST_ACTIVITY_STORAGE_KEY, userId), String(Date.now()));
}

function moveSharedAccountSettings(ownerId?: string) {
  for (const key of [FORGET_AFTER_STORAGE_KEY, LAST_ACTIVITY_STORAGE_KEY]) {
    const value = window.localStorage.getItem(key);
    if (value !== null && ownerId) {
      const scopedKey = accountSettingKey(key, ownerId);
      if (window.localStorage.getItem(scopedKey) === null) {
        window.localStorage.setItem(scopedKey, value);
      }
    }
    window.localStorage.removeItem(key);
  }
}

function AuthShell({ children }: PropsWithChildren) {
  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow--lime" aria-hidden="true" />
      <div className="auth-glow auth-glow--mint" aria-hidden="true" />
      <div className="auth-layout">
        <section className="auth-hero" aria-label="Ana Fit">
          <div className="auth-brand">
            <span className="auth-brand-mark">
              <img src="/pwa-icon.svg?v=2" alt="" aria-hidden="true" />
            </span>
            <span>
              <strong>Ana Fit</strong>
              <small>Performance planner</small>
            </span>
          </div>

          <div className="auth-hero-copy">
            <span className="auth-hero-kicker"><Sparkles size={14} aria-hidden="true" /> Seu próximo nível começa aqui</span>
            <h2>Treine com foco.<br /><span>Evolua de verdade.</span></h2>
            <p>Treinos, séries, hábitos e progresso em um só lugar — sempre sincronizados com você.</p>
          </div>

          <div className="auth-benefits" aria-label="Recursos do aplicativo">
            <span><Dumbbell size={18} aria-hidden="true" /><strong>Séries</strong><small>sob medida</small></span>
            <span><Activity size={18} aria-hidden="true" /><strong>Progresso</strong><small>visível</small></span>
            <span><Trophy size={18} aria-hidden="true" /><strong>Ranks</strong><small>motivadores</small></span>
          </div>
        </section>

        <section className="auth-panel premium-card">
          {children}
          <div className="auth-secure-note">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Sessão protegida e progresso salvo na nuvem</span>
          </div>
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
    <label className="auth-field" htmlFor={id}>
      <span>{label}</span>
      <span className="auth-input-wrap">
        <input
          className="input auth-input pr-12"
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

type AuthFormMode = 'login' | 'signup' | 'reset';

function LoginScreen() {
  const [mode, setMode] = useState<AuthFormMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const resetMode = mode === 'reset';
  const signupMode = mode === 'signup';

  const changeMode = (nextMode: AuthFormMode) => {
    setMode(nextMode);
    setPassword('');
    setConfirmation('');
    setMessage('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setMessage('');

    if (resetMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      setBusy(false);
      setMessage(error ? 'Não foi possível enviar o e-mail. Confira o endereço e tente novamente.' : 'Confira sua caixa de entrada para criar uma nova senha.');
      return;
    }

    if (signupMode) {
      const displayName = name.trim().replace(/\s+/g, ' ');
      if (displayName.length < 2) {
        setBusy(false);
        setMessage('Informe seu nome para personalizar o aplicativo.');
        return;
      }
      if (password.length < 8) {
        setBusy(false);
        setMessage('Crie uma senha com pelo menos 8 caracteres.');
        return;
      }
      if (password !== confirmation) {
        setBusy(false);
        setMessage('As senhas não coincidem.');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName,
            force_password_change: false,
            created_via_anfit_signup: true,
          },
          emailRedirectTo: window.location.origin,
        },
      });
      setBusy(false);

      if (error) {
        setMessage('Não foi possível criar a conta. Confira os dados ou tente entrar com este e-mail.');
      } else if (!data.session) {
        setPassword('');
        setConfirmation('');
        setMessage('Conta criada. Confirme seu e-mail para entrar no aplicativo.');
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setMessage('E-mail ou senha incorretos. Tente novamente.');
    }
  };

  return (
    <AuthShell>
      <span className="auth-panel-kicker">
        {resetMode ? <Mail size={14} aria-hidden="true" /> : signupMode ? <UserPlus size={14} aria-hidden="true" /> : <LogIn size={14} aria-hidden="true" />}
        {resetMode ? 'Recuperação segura' : signupMode ? 'Novo perfil' : 'Seu espaço'}
      </span>
      <h1 className="auth-panel-title">{resetMode ? 'Recupere seu acesso' : signupMode ? 'Crie sua conta' : 'Que bom ter você de volta'}</h1>
      <p className="auth-panel-description">
        {resetMode
          ? 'Enviaremos um link seguro para você escolher outra senha.'
          : signupMode
            ? 'Tenha seus treinos e sua evolução protegidos em um perfil individual.'
            : 'Entre para continuar exatamente de onde parou.'}
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {signupMode ? (
          <label className="auth-field" htmlFor="signup-name">
            <span>Como podemos chamar você?</span>
            <span className="auth-input-wrap">
              <UserRound className="auth-input-icon" size={18} aria-hidden="true" />
              <input
                className="input auth-input pl-10"
                style={{ paddingLeft: '2.5rem' }}
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="Seu nome"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                required
              />
            </span>
          </label>
        ) : null}
        <label className="auth-field" htmlFor="login-email">
          <span>E-mail</span>
          <span className="auth-input-wrap">
            <Mail className="auth-input-icon" size={18} aria-hidden="true" />
            <input
              className="input auth-input pl-10"
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
          <PasswordField
            id="login-password"
            label={signupMode ? 'Crie uma senha' : 'Senha'}
            value={password}
            onChange={setPassword}
            autoComplete={signupMode ? 'new-password' : 'current-password'}
          />
        ) : null}
        {signupMode ? (
          <PasswordField id="signup-confirm-password" label="Confirme a senha" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
        ) : null}
        {message ? <p className="auth-message" role="status">{message}</p> : null}
        <button className="primary-button auth-submit w-full" type="submit" disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" size={19} aria-hidden="true" /> : resetMode ? <Mail size={19} aria-hidden="true" /> : signupMode ? <UserPlus size={19} aria-hidden="true" /> : <LogIn size={19} aria-hidden="true" />}
          {busy ? 'Aguarde...' : resetMode ? 'Enviar link seguro' : signupMode ? 'Criar minha conta' : 'Entrar no Ana Fit'}
        </button>
      </form>

      {mode === 'login' ? (
        <>
          <button className="auth-link-button" type="button" onClick={() => changeMode('reset')}>Esqueci minha senha</button>
          <button className="auth-link-button" type="button" onClick={() => changeMode('signup')}>Ainda não tenho conta · Criar conta</button>
        </>
      ) : (
        <button className="auth-link-button" type="button" onClick={() => changeMode('login')}>Voltar para o login</button>
      )}
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
    const displayName = getUserDisplayName(user) ?? 'Atleta';
    const { data, error } = await supabase.auth.updateUser({
      password,
      data: { ...user.user_metadata, force_password_change: false, display_name: displayName },
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

function withUserProfileName(data: unknown, user: User) {
  const displayName = getUserDisplayName(user) ?? 'Atleta';
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { schemaVersion: 5, profile: { name: displayName } };
  }

  const appData = data as Record<string, unknown>;
  const storedProfile = appData.profile;
  const profile = storedProfile && typeof storedProfile === 'object' && !Array.isArray(storedProfile)
    ? storedProfile as Record<string, unknown>
    : {};
  const storedName = typeof profile.name === 'string' ? profile.name.trim() : '';

  return storedName
    ? data
    : { ...appData, profile: { ...profile, name: displayName } };
}

async function uploadUserData(userId: string, data: unknown) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('anfit_user_app_data').upsert({ user_id: userId, data });
  if (error) throw error;
}

async function assertActiveUser(userId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (data.user?.id !== userId) throw new Error('Authentication changed while preparing local data.');
}

async function prepareUserData(user: User): Promise<MigrationResult> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = user.id;

  const { data: remoteRow, error } = await supabase.from('anfit_user_app_data').select('data').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  await assertActiveUser(userId);

  const previousOwner = window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);
  const accountWasCreatedInApp = user.user_metadata?.created_via_anfit_signup === true;
  if (previousOwner && previousOwner !== userId) {
    moveSharedAccountSettings(previousOwner);
    preserveDataFromAnotherAccount(previousOwner);
  } else {
    moveSharedAccountSettings(accountWasCreatedInApp ? undefined : userId);
  }

  const mayClaimSharedCopy = !accountWasCreatedInApp && (!previousOwner || previousOwner === userId);
  const localCopy = readStoredAppData(userId, mayClaimSharedCopy);
  const pendingMarker = readCloudPendingMarker(userId);
  const scopedStorageKey = getUserAppStorageKey(userId);

  const finishPreparation = async (data: unknown, source?: string) => {
    await assertActiveUser(userId);
    writeStoredAppData(data, userId);
    if (source === APP_STORAGE_KEY || source === LEGACY_APP_STORAGE_KEY) {
      clearSharedStoredAppData();
    }
    window.localStorage.setItem(CLOUD_OWNER_STORAGE_KEY, userId);
    try {
      await assertActiveUser(userId);
    } catch (error) {
      if (window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY) === userId) {
        window.localStorage.removeItem(CLOUD_OWNER_STORAGE_KEY);
      }
      throw error;
    }
  };

  if (pendingMarker?.ownerId === userId && localCopy) {
    const preparedData = withUserProfileName(localCopy.data, user);
    await uploadUserData(userId, preparedData);
    await finishPreparation(preparedData, localCopy.source);
    clearCloudPendingMarker(pendingMarker.version, userId);
    return 'uploaded';
  }

  if (remoteRow?.data) {
    const preparedData = withUserProfileName(remoteRow.data, user);
    await finishPreparation(preparedData);
    if (!previousOwner && readStoredAppData()) preserveUnclaimedStoredData();
    if (previousOwner === userId) clearSharedStoredAppData();
    clearCloudPendingMarker(undefined, userId);
    return 'downloaded';
  }

  if (localCopy) {
    const preparedData = withUserProfileName(localCopy.data, user);
    await uploadUserData(userId, preparedData);
    await finishPreparation(preparedData, localCopy.source === scopedStorageKey ? undefined : localCopy.source);
    clearCloudPendingMarker(undefined, userId);
    return 'uploaded';
  }

  if (!previousOwner && readStoredAppData()) preserveUnclaimedStoredData();
  const initialData = withUserProfileName(null, user);
  await uploadUserData(userId, initialData);
  await finishPreparation(initialData);
  clearCloudPendingMarker(undefined, userId);
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

      if (nextUser && sessionExpired(nextUser)) {
        window.localStorage.removeItem(accountSettingKey(LAST_ACTIVITY_STORAGE_KEY, nextUser.id));
        void detachPushSubscriptionForCurrentUser()
          .catch(() => false)
          .finally(() => client.auth.signOut({ scope: 'local' }));
        setUser(null);
        setStage('login');
        return;
      }

      setUser(nextUser);
      setForgetAfterDaysState(readForgetAfterDays(nextUser?.id, nextUser?.user_metadata?.created_via_anfit_signup !== true));
      if (!nextUser) {
        setStage('login');
      } else if (recovery || nextUser.user_metadata.force_password_change === true) {
        recordActivity(nextUser.id);
        setStage('password');
      } else {
        recordActivity(nextUser.id);
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
      if (sessionExpired(user)) {
        void detachPushSubscriptionForCurrentUser()
          .catch(() => false)
          .finally(() => client.auth.signOut({ scope: 'local' }));
        return;
      }

      if (Date.now() - lastRecordedAt > 60_000) {
        lastRecordedAt = Date.now();
        recordActivity(user.id);
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

    prepareUserData(user)
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
    if (!import.meta.env.DEV) {
      return (
        <AuthShell>
          <Cloud className="text-rose-300" size={30} aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-black text-white">Acesso temporariamente indisponível</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            A conexão segura não foi configurada. Seus dados locais permanecem bloqueados neste aparelho.
          </p>
        </AuthShell>
      );
    }

    return (
      <AuthContext.Provider
        value={{
          user: null,
          displayName: null,
          cloudEnabled: false,
          migrationResult: 'empty',
          forgetAfterDays,
          setForgetAfterDays: (days) => {
            setForgetAfterDaysState(days);
            if (days) {
              window.localStorage.setItem(accountSettingKey(FORGET_AFTER_STORAGE_KEY), String(days));
            } else {
              window.localStorage.removeItem(accountSettingKey(FORGET_AFTER_STORAGE_KEY));
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
        displayName: getUserDisplayName(user),
        cloudEnabled: true,
        migrationResult,
        forgetAfterDays,
        setForgetAfterDays: (days) => {
          setForgetAfterDaysState(days);
          if (days) {
            window.localStorage.setItem(accountSettingKey(FORGET_AFTER_STORAGE_KEY, user.id), String(days));
          } else {
            window.localStorage.removeItem(accountSettingKey(FORGET_AFTER_STORAGE_KEY, user.id));
          }
          recordActivity(user.id);
        },
        signOut: async () => {
          await detachPushSubscriptionForCurrentUser().catch(() => false);
          if (supabase) await supabase.auth.signOut({ scope: 'local' });
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
