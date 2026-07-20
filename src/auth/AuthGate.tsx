import type { User } from '@supabase/supabase-js';
import { Activity, CheckCircle2, Cloud, Dumbbell, Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, Mail, ShieldCheck, Sparkles, Trophy, UserPlus, UserRound } from 'lucide-react';
import { type FormEvent, type PropsWithChildren, useEffect, useState } from 'react';
import { AuthContext, getUserDisplayName, type ForgetAfterDays, type MigrationResult } from './authContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AppData } from '../types';
import { normalizeAssignedNutritionPlan } from '../utils/assignedNutritionPlan';
import { detachPushSubscriptionForCurrentUser } from '../utils/notifications';
import {
  APP_STORAGE_KEY,
  clearSharedStoredAppData,
  clearCloudPendingMarker,
  completeCloudUpload,
  CLOUD_OWNER_STORAGE_KEY,
  getUserAppStorageKey,
  LEGACY_APP_STORAGE_KEY,
  preserveDataFromAnotherAccount,
  preservePendingUserDataBeforeCloudDownload,
  preserveUnclaimedStoredData,
  readCloudPendingMarker,
  readCloudSyncVersion,
  readStoredAppData,
  writeCloudSyncVersion,
  writeStoredAppData,
} from '../lib/storage';

const FORGET_AFTER_STORAGE_KEY = 'ana-fit-planner:forget-after-days:v1';
const LAST_ACTIVITY_STORAGE_KEY = 'ana-fit-planner:last-activity:v1';

class CloudConflictError extends Error {}

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
            requires_onboarding: true,
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

type AssignedNutritionMarker = {
  id: string;
  revision: number;
  assignedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readAssignedNutritionMarker(user: User): AssignedNutritionMarker | null {
  const metadata = isRecord(user.app_metadata) ? user.app_metadata : {};
  const id = metadata.assigned_nutrition_plan_id;
  const revision = metadata.assigned_nutrition_plan_revision;
  const assignedAt = metadata.assigned_nutrition_plan_assigned_at;
  const hasAnyMarkerField = id !== undefined || revision !== undefined || assignedAt !== undefined;

  if (!hasAnyMarkerField) return null;
  if (
    typeof id !== 'string' ||
    !id.trim() ||
    typeof revision !== 'number' ||
    !Number.isInteger(revision) ||
    revision < 1 ||
    typeof assignedAt !== 'string' ||
    !assignedAt.trim() ||
    !Number.isFinite(Date.parse(assignedAt))
  ) {
    throw new Error('Invalid assigned nutrition marker.');
  }

  return { id, revision, assignedAt };
}

function sameAssignedNutritionMarker(first: AssignedNutritionMarker | null, second: AssignedNutritionMarker | null) {
  if (!first || !second) return first === second;
  return first.id === second.id && first.revision === second.revision && first.assignedAt === second.assignedAt;
}

function hasAssignedNutritionField(data: unknown) {
  return isRecord(data) && Object.prototype.hasOwnProperty.call(data, 'assignedNutritionPlan');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAssignedMealOption(value: unknown) {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    Boolean(value.id.trim()) &&
    typeof value.title === 'string' &&
    isStringArray(value.items) &&
    value.items.length > 0 &&
    (value.note === undefined || typeof value.note === 'string');
}

function isAssignedMeal(value: unknown, requireMacros: boolean) {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    typeof value.title !== 'string' ||
    typeof value.time !== 'string' ||
    typeof value.note !== 'string' ||
    !isStringArray(value.items) ||
    (value.optional !== undefined && typeof value.optional !== 'boolean') ||
    (value.appliesTo !== undefined && value.appliesTo !== 'training' && value.appliesTo !== 'rest' && value.appliesTo !== 'both') ||
    (value.options !== undefined &&
      (!Array.isArray(value.options) || !value.options.every(isAssignedMealOption))) ||
    (value.items.length === 0 && (!Array.isArray(value.options) || value.options.length === 0))
  ) return false;

  if (Array.isArray(value.options)) {
    const optionIds = value.options.map((option) => (option as Record<string, unknown>).id);
    if (new Set(optionIds).size !== optionIds.length) return false;
  }

  const macroFields = ['calories', 'protein', 'carbs', 'fat'];
  const optionalMacrosAreValid = macroFields.every(
    (field) => value[field] === undefined || (typeof value[field] === 'number' && Number.isFinite(value[field]))
  );
  return optionalMacrosAreValid && (!requireMacros || macroFields.every((field) => value[field] !== undefined));
}

function getAuthoritativeNutrition(data: unknown, marker: AssignedNutritionMarker) {
  if (!isRecord(data)) throw new Error('Assigned nutrition row is missing.');

  const plan = normalizeAssignedNutritionPlan(data.assignedNutritionPlan);
  if (
    !plan ||
    plan.id !== marker.id ||
    plan.revision !== marker.revision ||
    plan.assignedAt !== marker.assignedAt
  ) {
    throw new Error('Assigned nutrition marker does not match the remote plan.');
  }

  const goals = data.goals;
  if (
    !isRecord(goals) ||
    !['calories', 'protein', 'fat', 'waterLiters'].every(
      (field) => typeof goals[field] === 'number' && Number.isFinite(goals[field])
    )
  ) {
    throw new Error('Assigned nutrition goals are invalid.');
  }

  const meals = data.meals;
  const requireMealMacros = plan.mealStrategy === 'fixed';
  if (!Array.isArray(meals) || meals.length === 0 || !meals.every((meal) => isAssignedMeal(meal, requireMealMacros))) {
    throw new Error('Assigned nutrition meals are invalid.');
  }
  const mealIds = meals.map((meal) => (meal as Record<string, unknown>).id);
  if (new Set(mealIds).size !== mealIds.length) {
    throw new Error('Assigned nutrition meal IDs are duplicated.');
  }

  const profile = data.profile;
  if (!isRecord(profile) || !isStringArray(profile.preferredFoods) || !isStringArray(profile.avoidedFoods)) {
    throw new Error('Assigned nutrition preferences are invalid.');
  }

  return {
    plan,
    goals,
    meals,
    preferredFoods: profile.preferredFoods,
    avoidedFoods: profile.avoidedFoods,
  };
}

function mergeAuthoritativeNutrition(localData: unknown, remoteData: unknown, marker: AssignedNutritionMarker) {
  const nutrition = getAuthoritativeNutrition(remoteData, marker);
  if (!isRecord(remoteData) || !isRecord(localData)) {
    throw new Error('Cannot merge an assigned nutrition plan into incomplete app data.');
  }

  const remoteProfile = isRecord(remoteData.profile) ? remoteData.profile : {};
  const localProfile = isRecord(localData.profile) ? localData.profile : {};
  return {
    ...remoteData,
    ...localData,
    profile: {
      ...remoteProfile,
      ...localProfile,
      preferredFoods: nutrition.preferredFoods,
      avoidedFoods: nutrition.avoidedFoods,
    },
    goals: nutrition.goals,
    meals: nutrition.meals,
    assignedNutritionPlan: nutrition.plan,
  };
}

function hasRecordEntries(value: unknown) {
  return isRecord(value) && Object.keys(value).length > 0;
}

function hasSubstantiveAppData(data: unknown) {
  if (!isRecord(data)) return false;

  const profile = isRecord(data.profile) ? data.profile : {};
  if (profile.onboardingCompleted === true) return true;

  const profileHasPersonalization = [
    'heightCm',
    'weightKg',
    'trainingDays',
    'cardioDays',
    'objective',
    'eatingStyle',
    'mealsPerDay',
  ].some((field) => Object.prototype.hasOwnProperty.call(profile, field));

  return profileHasPersonalization ||
    hasRecordEntries(data.goals) ||
    (Array.isArray(data.meals) && data.meals.length > 0) ||
    (Array.isArray(data.workouts) && data.workouts.length > 0) ||
    (Array.isArray(data.weekPlan) && data.weekPlan.length > 0) ||
    hasRecordEntries(data.dailyChecks) ||
    hasRecordEntries(data.rank) ||
    (Array.isArray(data.progressEntries) && data.progressEntries.length > 0);
}

function hasIncompleteOnboarding(data: unknown) {
  return isRecord(data) && isRecord(data.profile) && data.profile.onboardingCompleted === false;
}

function withUserProfileName(data: unknown, user: User, initializeOnboarding = false) {
  const displayName = getUserDisplayName(user) ?? 'Atleta';
  const requiresOnboarding = initializeOnboarding || user.user_metadata?.requires_onboarding === true;
  const emptyOnboardingProfile = {
    onboardingCompleted: false,
    age: 0,
    heightCm: 0,
    weightKg: 0,
    preferredFoods: [],
    avoidedFoods: [],
  };

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      schemaVersion: 5,
      profile: { name: displayName, ...(requiresOnboarding ? emptyOnboardingProfile : {}) },
    };
  }

  const appData = data as Record<string, unknown>;
  const storedProfile = appData.profile;
  const profile = storedProfile && typeof storedProfile === 'object' && !Array.isArray(storedProfile)
    ? storedProfile as Record<string, unknown>
    : {};
  const storedName = typeof profile.name === 'string' ? profile.name.trim() : '';
  const shouldInitializeOnboarding = requiresOnboarding && profile.onboardingCompleted !== true;
  const onboardingDefaults = shouldInitializeOnboarding
    ? {
        onboardingCompleted: false,
        age: typeof profile.age === 'number' ? profile.age : 0,
        heightCm: typeof profile.heightCm === 'number' ? profile.heightCm : 0,
        weightKg: typeof profile.weightKg === 'number' ? profile.weightKg : 0,
        preferredFoods: Array.isArray(profile.preferredFoods) ? profile.preferredFoods : [],
        avoidedFoods: Array.isArray(profile.avoidedFoods) ? profile.avoidedFoods : [],
      }
    : {};

  if (storedName && !shouldInitializeOnboarding) return data;

  return {
    ...appData,
    profile: {
      ...profile,
      ...onboardingDefaults,
      name: storedName || displayName,
    },
  };
}

async function uploadUserData(userId: string, data: unknown) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: insertedRow, error } = await supabase
    .from('anfit_user_app_data')
    .insert({ user_id: userId, data })
    .select('updated_at')
    .single();
  if (error) throw error;
  if (typeof insertedRow.updated_at !== 'string') throw new Error('The remote version is missing after insert.');
  return insertedRow.updated_at;
}

async function uploadVersionedUserData(userId: string, data: unknown, expectedUpdatedAt: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: updatedRow, error } = await supabase
    .from('anfit_user_app_data')
    .update({ data })
    .eq('user_id', userId)
    .eq('updated_at', expectedUpdatedAt)
    .select('updated_at')
    .maybeSingle();
  if (error) throw error;
  if (!updatedRow) throw new Error('Remote app data changed while it was being saved.');
  if (typeof updatedRow.updated_at !== 'string') throw new Error('The remote version is missing after update.');
  return updatedRow.updated_at;
}

async function assertActiveUser(userId: string, expectedMarker?: AssignedNutritionMarker | null) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (data.user?.id !== userId) throw new Error('Authentication changed while preparing local data.');
  if (expectedMarker !== undefined && !sameAssignedNutritionMarker(readAssignedNutritionMarker(data.user), expectedMarker)) {
    throw new Error('Assigned nutrition changed while preparing local data.');
  }
  return data.user;
}

async function prepareUserData(user: User): Promise<MigrationResult> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = user.id;

  const { data: remoteRow, error } = await supabase
    .from('anfit_user_app_data')
    .select('data,updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  const activeUser = await assertActiveUser(userId);
  const assignedNutritionMarker = readAssignedNutritionMarker(activeUser);
  const remoteHasAssignedNutrition = hasAssignedNutritionField(remoteRow?.data);

  if (assignedNutritionMarker) {
    getAuthoritativeNutrition(remoteRow?.data, assignedNutritionMarker);
  } else if (remoteHasAssignedNutrition) {
    throw new Error('Remote assigned nutrition is missing its authoritative account marker.');
  }

  const previousOwner = window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY);
  const accountWasCreatedInApp = activeUser.user_metadata?.created_via_anfit_signup === true;
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
  const remoteHasSubstantiveData = hasSubstantiveAppData(remoteRow?.data);
  const localHasSubstantiveData = hasSubstantiveAppData(localCopy?.data);
  const initializeOnboarding =
    activeUser.user_metadata?.requires_onboarding === true ||
    hasIncompleteOnboarding(remoteRow?.data) ||
    (!remoteHasSubstantiveData && (hasIncompleteOnboarding(localCopy?.data) || !localHasSubstantiveData));

  if (!assignedNutritionMarker && localCopy && hasAssignedNutritionField(localCopy.data)) {
    throw new Error('Local assigned nutrition is missing its authoritative account marker.');
  }

  const finishPreparation = async (data: unknown, updatedAt: string, source?: string) => {
    await assertActiveUser(userId, assignedNutritionMarker);
    writeStoredAppData(data, userId);
    writeCloudSyncVersion(userId, updatedAt);
    if (source === APP_STORAGE_KEY || source === LEGACY_APP_STORAGE_KEY) {
      clearSharedStoredAppData();
    }
    window.localStorage.setItem(CLOUD_OWNER_STORAGE_KEY, userId);
    try {
      await assertActiveUser(userId, assignedNutritionMarker);
    } catch (error) {
      if (window.localStorage.getItem(CLOUD_OWNER_STORAGE_KEY) === userId) {
        window.localStorage.removeItem(CLOUD_OWNER_STORAGE_KEY);
      }
      throw error;
    }
  };

  if (pendingMarker?.ownerId === userId && localCopy) {
    const localData = withUserProfileName(localCopy.data, activeUser, initializeOnboarding);
    const preparedData = assignedNutritionMarker
      ? mergeAuthoritativeNutrition(localData, remoteRow?.data, assignedNutritionMarker)
      : localData;
    await assertActiveUser(userId, assignedNutritionMarker);
    let uploadedAt: string;
    if (remoteRow) {
      if (typeof remoteRow.updated_at !== 'string') {
        throw new Error('Remote app data is missing its concurrency version.');
      }
      if (JSON.stringify(preparedData) === JSON.stringify(remoteRow.data)) {
        uploadedAt = remoteRow.updated_at;
      } else if (!pendingMarker.baseUpdatedAt) {
        throw new CloudConflictError('Local changes have no safe cloud base.');
      } else {
        if (pendingMarker.baseUpdatedAt !== remoteRow.updated_at) {
          throw new CloudConflictError('Cloud data changed on another device.');
        }
        uploadedAt = await uploadVersionedUserData(userId, preparedData, pendingMarker.baseUpdatedAt);
      }
    } else {
      if (pendingMarker.baseUpdatedAt) {
        throw new CloudConflictError('The cloud row disappeared after local changes were created.');
      }
      uploadedAt = await uploadUserData(userId, preparedData);
    }
    await finishPreparation(preparedData, uploadedAt, localCopy.source);
    clearCloudPendingMarker(pendingMarker.version, userId);
    return 'uploaded';
  }

  if (remoteRow?.data && !remoteHasSubstantiveData && localCopy && localHasSubstantiveData) {
    if (typeof remoteRow.updated_at !== 'string') {
      throw new Error('New account data is missing its concurrency version.');
    }
    const preparedData = withUserProfileName(localCopy.data, activeUser, initializeOnboarding);
    await assertActiveUser(userId, assignedNutritionMarker);
    const uploadedAt = await uploadVersionedUserData(userId, preparedData, remoteRow.updated_at);
    await finishPreparation(preparedData, uploadedAt, localCopy.source === scopedStorageKey ? undefined : localCopy.source);
    clearCloudPendingMarker(undefined, userId);
    return 'uploaded';
  }

  if (remoteRow?.data) {
    const remoteWasEmpty = !remoteHasSubstantiveData;
    const preparedData = withUserProfileName(remoteRow.data, activeUser, initializeOnboarding);
    if (remoteWasEmpty) {
      if (typeof remoteRow.updated_at !== 'string') {
        throw new Error('New account data is missing its concurrency version.');
      }
      await assertActiveUser(userId, assignedNutritionMarker);
      const uploadedAt = await uploadVersionedUserData(userId, preparedData, remoteRow.updated_at);
      await finishPreparation(preparedData, uploadedAt);
    } else {
      if (typeof remoteRow.updated_at !== 'string') {
        throw new Error('Remote app data is missing its concurrency version.');
      }
      await finishPreparation(preparedData, remoteRow.updated_at);
    }
    if (!previousOwner && readStoredAppData()) preserveUnclaimedStoredData();
    if (previousOwner === userId) clearSharedStoredAppData();
    clearCloudPendingMarker(undefined, userId);
    return remoteWasEmpty ? 'uploaded' : 'downloaded';
  }

  if (localCopy) {
    const preparedData = withUserProfileName(localCopy.data, activeUser, initializeOnboarding);
    const uploadedAt = await uploadUserData(userId, preparedData);
    await finishPreparation(preparedData, uploadedAt, localCopy.source === scopedStorageKey ? undefined : localCopy.source);
    clearCloudPendingMarker(undefined, userId);
    return 'uploaded';
  }

  if (!previousOwner && readStoredAppData()) preserveUnclaimedStoredData();
  const initialData = withUserProfileName(null, activeUser, true);
  const uploadedAt = await uploadUserData(userId, initialData);
  await finishPreparation(initialData, uploadedAt);
  clearCloudPendingMarker(undefined, userId);
  return 'empty';
}

async function persistCompletedOnboarding(user: User, completedData: AppData) {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (completedData.profile.onboardingCompleted !== true) {
    throw new Error('Onboarding data is not marked as completed.');
  }

  const activeUser = await assertActiveUser(user.id);
  const assignedNutritionMarker = readAssignedNutritionMarker(activeUser);
  const localBaseUpdatedAt = readCloudSyncVersion(user.id);
  const { data: remoteRow, error } = await supabase
    .from('anfit_user_app_data')
    .select('data,updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;

  await assertActiveUser(user.id, assignedNutritionMarker);
  const remoteHasAssignedNutrition = hasAssignedNutritionField(remoteRow?.data);
  if (!assignedNutritionMarker && (remoteHasAssignedNutrition || hasAssignedNutritionField(completedData))) {
    throw new Error('Assigned nutrition is missing its authoritative account marker.');
  }

  const dataToSave = assignedNutritionMarker
    ? mergeAuthoritativeNutrition(completedData, remoteRow?.data, assignedNutritionMarker)
    : completedData;

  let savedUpdatedAt: string;
  if (remoteRow) {
    if (typeof remoteRow.updated_at !== 'string') {
      throw new Error('Account data is missing its concurrency version.');
    }
    if (!localBaseUpdatedAt || localBaseUpdatedAt !== remoteRow.updated_at) {
      throw new CloudConflictError('Cloud data changed while onboarding was open.');
    }
    savedUpdatedAt = await uploadVersionedUserData(user.id, dataToSave, localBaseUpdatedAt);
  } else {
    if (localBaseUpdatedAt) {
      throw new CloudConflictError('The cloud row disappeared while onboarding was open.');
    }
    savedUpdatedAt = await uploadUserData(user.id, dataToSave);
  }

  const { data: persistedRow, error: verificationError } = await supabase
    .from('anfit_user_app_data')
    .select('data,updated_at')
    .eq('user_id', user.id)
    .single();
  if (verificationError) throw verificationError;
  if (
    !isRecord(persistedRow.data) ||
    !isRecord(persistedRow.data.profile) ||
    persistedRow.data.profile.onboardingCompleted !== true
  ) {
    throw new Error('Completed onboarding was not persisted.');
  }
  if (assignedNutritionMarker) {
    getAuthoritativeNutrition(persistedRow.data, assignedNutritionMarker);
  } else if (hasAssignedNutritionField(persistedRow.data)) {
    throw new Error('Persisted nutrition is missing its authoritative account marker.');
  }
  if (persistedRow.updated_at !== savedUpdatedAt) {
    throw new Error('The onboarding save could not be verified against its remote version.');
  }
  const completedPendingMarker = readCloudPendingMarker(user.id);
  if (completedPendingMarker) {
    completeCloudUpload(user.id, completedPendingMarker.version, savedUpdatedAt);
  } else {
    writeCloudSyncVersion(user.id, savedUpdatedAt);
  }

  const verifiedUser = await assertActiveUser(user.id, assignedNutritionMarker);
  if (verifiedUser.user_metadata?.requires_onboarding !== true) {
    return { data: persistedRow.data as unknown as AppData, user: verifiedUser };
  }

  const { data: updateResult, error: metadataError } = await supabase.auth.updateUser({
    data: { ...verifiedUser.user_metadata, requires_onboarding: false },
  });
  if (metadataError || !updateResult.user) {
    throw metadataError ?? new Error('Could not finish onboarding metadata.');
  }

  return { data: persistedRow.data as unknown as AppData, user: updateResult.user };
}

export function AuthGate({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [stage, setStage] = useState<'loading' | 'login' | 'password' | 'preparing' | 'ready' | 'error'>('loading');
  const [preparationError, setPreparationError] = useState<'conflict' | 'generic' | null>(null);
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
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
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
        setPreparationError(null);
        setMigrationResult(result);
        setStage('ready');
      })
      .catch((error: unknown) => {
        if (active) {
          setPreparationError(error instanceof CloudConflictError ? 'conflict' : 'generic');
          setStage('error');
        }
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
          markOnboardingComplete: async (data) => data,
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
    const hasConflict = preparationError === 'conflict';
    const useCloudCopy = () => {
      try {
        if (!preservePendingUserDataBeforeCloudDownload(user.id)) {
          clearCloudPendingMarker(undefined, user.id);
        }
        setPreparationError(null);
        setStage('preparing');
      } catch {
        setPreparationError('generic');
      }
    };

    return (
      <AuthShell>
        <Cloud className="text-rose-300" size={30} aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-black text-white">
          {hasConflict ? 'Alterações em dois aparelhos' : 'Não foi possível sincronizar'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {hasConflict
            ? 'A nuvem e este aparelho têm mudanças diferentes. Nada foi apagado. Você pode tentar novamente ou guardar uma cópia local e abrir a versão da nuvem.'
            : 'Seus dados locais continuam preservados. Verifique a conexão e tente novamente.'}
        </p>
        <button
          className="primary-button mt-6 w-full"
          type="button"
          onClick={() => {
            setPreparationError(null);
            setStage('preparing');
          }}
        >
          Tentar novamente
        </button>
        {hasConflict ? (
          <button className="secondary-button mt-3 w-full" type="button" onClick={useCloudCopy}>
            Guardar cópia local e usar nuvem
          </button>
        ) : null}
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
        markOnboardingComplete: async (data) => {
          const result = await persistCompletedOnboarding(user, data);
          setUser((currentUser) => currentUser?.id === result.user.id ? result.user : currentUser);
          return result.data;
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
