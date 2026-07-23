import { Bell, CircleHelp, Cloud, CloudOff, LogOut, RefreshCw, RotateCcw, Save, Send, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth, type ForgetAfterDays } from '../auth/authContext';
import { Card } from '../components/Card';
import { WorkoutPlanManager } from '../components/WorkoutPlanManager';
import type { CloudSyncStatus } from '../hooks/useCloudSync';
import type {
  AppData,
  EatingStyle,
  FitnessObjective,
  Goals,
  NotificationSettings,
  Profile,
  Reminder,
  WeekPlanItem,
  Workout,
} from '../types';
import { estimateProtein } from '../utils/calculations';
import { calculateDynamicGoals } from '../utils/dietCalculator';
import { enablePushNotifications, getNotificationSupportMessage, showTestNotification } from '../utils/notifications';

type SettingsProps = {
  data: AppData;
  onProfileChange: (profile: Partial<Profile>) => void;
  onGoalsChange: (goals: Partial<Goals>) => void;
  onNotificationsChange: (notifications: Partial<NotificationSettings>) => void;
  onWeekPlanChange: (weekPlan: WeekPlanItem[]) => void;
  onWorkoutsChange: (workouts: Workout[]) => void;
  onResetData: () => void;
  onOpenTutorial: () => void;
  cloudSync: {
    status: CloudSyncStatus;
    lastSyncedAt: string | null;
    retry: () => Promise<boolean>;
  };
};

const forgetOptions: Array<{ value: ForgetAfterDays; label: string }> = [
  { value: null, label: 'Nunca esquecer' },
  { value: 7, label: 'Após 7 dias sem uso' },
  { value: 30, label: 'Após 30 dias sem uso' },
  { value: 90, label: 'Após 90 dias sem uso' },
];

const objectiveOptions: Array<{ value: FitnessObjective; label: string }> = [
  { value: 'body-recomposition', label: 'Recomposição corporal' },
  { value: 'fat-loss', label: 'Redução de gordura' },
  { value: 'muscle-gain', label: 'Ganho de massa' },
  { value: 'performance', label: 'Performance' },
];

const eatingStyleOptions: Array<{ value: EatingStyle; label: string }> = [
  { value: 'omnivore', label: 'Onívora' },
  { value: 'flexitarian', label: 'Flexitariana' },
  { value: 'vegetarian', label: 'Vegetariana' },
  { value: 'vegan', label: 'Vegana' },
  { value: 'pescatarian', label: 'Pescetariana' },
];

const mealCountOptions = [3, 4, 5, 6] as const;

export function Settings({ data, onProfileChange, onGoalsChange, onNotificationsChange, onWeekPlanChange, onWorkoutsChange, onResetData, onOpenTutorial, cloudSync }: SettingsProps) {
  const [notificationMessage, setNotificationMessage] = useState('');
  const assignedPlan = data.assignedNutritionPlan;
  const { user, cloudEnabled, migrationResult, forgetAfterDays, setForgetAfterDays, signOut } = useAuth();
  const assignedProteinRange = assignedPlan?.targets?.proteinGrams;
  const hasAssignedProteinRange =
    typeof assignedProteinRange?.min === 'number' &&
    Number.isFinite(assignedProteinRange.min) &&
    typeof assignedProteinRange.max === 'number' &&
    Number.isFinite(assignedProteinRange.max);
  const proteinRange = assignedPlan
    ? hasAssignedProteinRange
      ? { low: assignedProteinRange.min, high: assignedProteinRange.max }
      : null
    : estimateProtein(data.profile.weightKg);
  const suggestedGoals = calculateDynamicGoals(data.profile);
  const supportMessage = getNotificationSupportMessage();
  const syncMessage =
    cloudSync.status === 'saving'
      ? 'Salvando na nuvem...'
      : cloudSync.status === 'offline'
        ? 'Sem internet — alterações protegidas neste aparelho'
        : cloudSync.status === 'error'
          ? 'Falha ao sincronizar. Toque para tentar novamente.'
          : cloudSync.lastSyncedAt
            ? `Nuvem atualizada às ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(cloudSync.lastSyncedAt))}`
            : migrationResult === 'uploaded'
              ? 'Dados deste iPhone enviados para sua conta'
              : migrationResult === 'downloaded'
                ? 'Dados da sua conta carregados neste aparelho'
                : 'Dados protegidos e sincronizados';

  const updateReminder = (reminderId: string, changes: Partial<Reminder>) => {
    onNotificationsChange({
      reminders: data.notifications.reminders.map((reminder) => (reminder.id === reminderId ? { ...reminder, ...changes } : reminder)),
    });
  };

  const handleEnableNotifications = async () => {
    setNotificationMessage('Sincronizando lembretes...');

    try {
      const result = await enablePushNotifications(data.notifications);
      onNotificationsChange({
        enabled: true,
        permission: result.permission,
        subscriptionEndpoint: result.endpoint,
        lastSync: result.syncedAt,
      });
      setNotificationMessage('Notificações sincronizadas. No iPhone, abra o app pelo ícone da Tela de Início.');
    } catch (error) {
      setNotificationMessage(error instanceof Error ? error.message : 'Não foi possível ativar as notificações.');
    }
  };

  const handleTestNotification = async () => {
    setNotificationMessage('Enviando teste...');

    try {
      await showTestNotification();
      setNotificationMessage('Teste enviado.');
    } catch (error) {
      setNotificationMessage(error instanceof Error ? error.message : 'Não foi possível enviar o teste.');
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3 pt-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-rose-700">Preferências e metas</p>
          <h1 className="page-title mt-1">Ajustes</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Organize sua rotina, perfil e preferências em um só lugar.</p>
        </div>
        <button
          aria-label="Abrir tour visual do aplicativo"
          className="mt-1 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 text-xs font-extrabold text-slate-300"
          onClick={onOpenTutorial}
          type="button"
        >
          <CircleHelp size={16} aria-hidden="true" /> Tour do app
        </button>
      </header>

      {cloudEnabled && user ? (
      <Card>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300">
            <ShieldCheck size={23} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="section-title">Conta de {data.profile.name || 'Atleta'}</h2>
            <p className="mt-1 truncate text-sm text-slate-400">{user.email}</p>
          </div>
        </div>

        <button
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left"
          type="button"
          onClick={() => { if (cloudSync.status === 'error' || cloudSync.status === 'offline') void cloudSync.retry(); }}
        >
          {cloudSync.status === 'offline' || cloudSync.status === 'error' ? (
            <CloudOff className="shrink-0 text-amber-300" size={20} aria-hidden="true" />
          ) : cloudSync.status === 'saving' ? (
            <RefreshCw className="shrink-0 animate-spin text-lime-300" size={20} aria-hidden="true" />
          ) : (
            <Cloud className="shrink-0 text-lime-300" size={20} aria-hidden="true" />
          )}
          <span className="text-sm font-semibold leading-snug text-slate-300">{syncMessage}</span>
        </button>

        <label className="mt-4 block space-y-1.5 text-sm font-semibold text-slate-200" htmlFor="forget-login">
          <span>Esquecer login neste iPhone</span>
          <select
            className="input"
            id="forget-login"
            value={forgetAfterDays ?? 'never'}
            onChange={(event) => setForgetAfterDays(event.target.value === 'never' ? null : Number(event.target.value) as 7 | 30 | 90)}
          >
            {forgetOptions.map((option) => (
              <option key={option.label} value={option.value ?? 'never'}>{option.label}</option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          “Nunca esquecer” mantém a conta conectada. Nos outros prazos, o contador reinicia sempre que o app é usado.
        </p>

        <button className="secondary-button mt-4 w-full" type="button" onClick={() => void cloudSync.retry().finally(signOut)}>
          <LogOut size={18} aria-hidden="true" />
          Sair da conta agora
        </button>
      </Card>
      ) : null}

      <WorkoutPlanManager data={data} onWeekPlanChange={onWeekPlanChange} onWorkoutsChange={onWorkoutsChange} />

      {assignedPlan ? (
        <Card className="border-amber-300/20 bg-amber-300/[0.06]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-amber-300" size={21} aria-hidden="true" />
            <div>
              <h2 className="section-title">Plano atribuído</h2>
              <p className="mt-1 text-sm font-semibold text-slate-200">{assignedPlan.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Metas e preferências alimentares ficam protegidas. Faça ajustes com responsável e profissional de saúde.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <div data-tour="settings-profile">
          <h2 className="section-title">Perfil</h2>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Dados pessoais, objetivo e preferências do seu plano.</p>
        </div>
        <div className="mt-4 grid gap-3">
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            <span>Nome</span>
            <input className="input" value={data.profile.name} onChange={(event) => onProfileChange({ name: event.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Peso atual</span>
              <input
                className="input"
                inputMode="decimal"
                value={data.profile.weightKg}
                onChange={(event) => onProfileChange({ weightKg: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Altura em cm</span>
              <input
                className="input"
                inputMode="numeric"
                value={data.profile.heightCm}
                onChange={(event) => onProfileChange({ heightCm: Number(event.target.value) || 0 })}
              />
            </label>
          </div>
          {!assignedPlan ? (
            <div className="mt-2 grid gap-3 border-t border-white/10 pt-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Preferências do plano</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Atualize o que você definiu ao criar sua conta. Essas escolhas ajudam a personalizar suas sugestões.
                </p>
              </div>
              <label className="block space-y-1 text-sm font-medium text-slate-700" htmlFor="profile-objective">
                <span>Objetivo atual</span>
                <select
                  className="input"
                  id="profile-objective"
                  value={data.profile.objective ?? ''}
                  onChange={(event) => onProfileChange({ objective: event.target.value as FitnessObjective })}
                >
                  <option value="" disabled>Escolha seu objetivo</option>
                  {objectiveOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700" htmlFor="profile-eating-style">
                <span>Estilo alimentar</span>
                <select
                  className="input"
                  id="profile-eating-style"
                  value={data.profile.eatingStyle ?? ''}
                  onChange={(event) => onProfileChange({ eatingStyle: event.target.value as EatingStyle })}
                >
                  <option value="" disabled>Escolha seu estilo alimentar</option>
                  {eatingStyleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Refeições por dia</legend>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {mealCountOptions.map((amount) => {
                    const selected = data.profile.mealsPerDay === amount;

                    return (
                      <button
                        className={`min-h-11 rounded-xl border px-2 text-sm font-bold transition ${
                          selected
                            ? 'border-lime-300/50 bg-lime-300/10 text-lime-100'
                            : 'border-white/10 bg-white/[0.035] text-slate-400'
                        }`}
                        type="button"
                        key={amount}
                        aria-pressed={selected}
                        onClick={() => onProfileChange({ mealsPerDay: amount })}
                      >
                        {amount}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500">
          A frequência de treino e cardio é calculada automaticamente pela rotina semanal.
        </p>
        {proteinRange ? (
          <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-medium text-teal-800">
            {assignedPlan ? 'Faixa de proteína do plano' : 'Proteína estimada para o peso atual'}: {proteinRange.low} a{' '}
            {proteinRange.high} g/dia.
          </p>
        ) : null}
      </Card>

      {!assignedPlan ? <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="section-title">Metas e dieta dinâmica</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Alterar estes campos recalcula as porções e os macros das refeições.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Calorias</span>
            <input
              className="input"
              inputMode="numeric"
              value={data.goals.calories}
              onChange={(event) => onGoalsChange({ calories: Number(event.target.value) || 0 })}
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Proteína</span>
            <input
              className="input"
              inputMode="numeric"
              value={data.goals.protein}
              onChange={(event) => onGoalsChange({ protein: Number(event.target.value) || 0 })}
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Gorduras</span>
            <input
              className="input"
              inputMode="numeric"
              value={data.goals.fat}
              onChange={(event) => onGoalsChange({ fat: Number(event.target.value) || 0 })}
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Água</span>
            <input
              className="input"
              inputMode="decimal"
              value={data.goals.waterLiters}
              onChange={(event) => onGoalsChange({ waterLiters: Number(event.target.value) || 0 })}
            />
          </label>
        </div>
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm leading-relaxed text-slate-600">
          Sugestão automática atual: {suggestedGoals.calories} kcal, {suggestedGoals.protein} g de proteína,{' '}
          {suggestedGoals.fat} g de gorduras e {suggestedGoals.waterLiters} L de água.
        </div>
        <button className="secondary-button mt-3 w-full" type="button" onClick={() => onGoalsChange(suggestedGoals)}>
          Recalcular dieta com o perfil atual
        </button>
      </Card> : null}

      <Card>
        <div className="flex items-center gap-2">
          <Bell className="text-teal-700" size={20} aria-hidden="true" />
          <h2 className="section-title">Notificações</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Inclui refeições, treino e o aviso de descanso concluído. No iPhone, funciona quando o app está instalado na Tela de Início e aberto pelo ícone.
        </p>
        <div className="mt-4 space-y-3">
          {data.notifications.reminders.map((reminder) => (
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3" key={reminder.id}>
              <input
                className="h-5 w-5 accent-teal-500"
                type="checkbox"
                checked={reminder.enabled}
                onChange={(event) => updateReminder(reminder.id, { enabled: event.target.checked })}
                aria-label={`Ativar ${reminder.label}`}
              />
              <span className="text-sm font-semibold text-slate-100">{reminder.label}</span>
              <input
                className="input w-28"
                type="time"
                value={reminder.time}
                onChange={(event) => updateReminder(reminder.id, { time: event.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="primary-button" type="button" onClick={handleEnableNotifications} disabled={Boolean(supportMessage)}>
            <Bell size={18} aria-hidden="true" />
            Ativar
          </button>
          <button className="secondary-button" type="button" onClick={handleTestNotification}>
            <Send size={18} aria-hidden="true" />
            Testar
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          {supportMessage ??
            notificationMessage ??
            `Status: ${data.notifications.enabled ? 'ativadas' : 'não ativadas'}. Permissão: ${data.notifications.permission}.`}
        </p>
      </Card>

      {!assignedPlan ? <Card>
        <h2 className="section-title">Alimentos</h2>
        <div className="mt-4 space-y-3">
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            <span>Preferidos</span>
            <textarea
              className="input min-h-28 resize-none"
              value={data.profile.preferredFoods.join('\n')}
              onChange={(event) =>
                onProfileChange({
                  preferredFoods: event.target.value
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            <span>Não come</span>
            <textarea
              className="input min-h-24 resize-none"
              value={data.profile.avoidedFoods.join('\n')}
              onChange={(event) =>
                onProfileChange({
                  avoidedFoods: event.target.value
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </div>
      </Card> : null}

      <div className="grid grid-cols-2 gap-3">
        <button className="secondary-button" type="button" onClick={onResetData}>
          <RotateCcw size={18} aria-hidden="true" />
          Reiniciar
        </button>
        <div className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-lime-300/20 bg-lime-300/[0.08] px-3 text-sm font-extrabold text-lime-100" aria-live="polite">
          <Save size={18} aria-hidden="true" />
          Salvamento automático
        </div>
      </div>

    </div>
  );
}
