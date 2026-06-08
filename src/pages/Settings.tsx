import { Bell, RotateCcw, Save, Send } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../components/Card';
import type { AppData, Goals, NotificationSettings, Profile, Reminder } from '../types';
import { estimateProtein } from '../utils/calculations';
import { calculateDynamicGoals } from '../utils/dietCalculator';
import { enablePushNotifications, getNotificationSupportMessage, showTestNotification } from '../utils/notifications';

type SettingsProps = {
  data: AppData;
  onProfileChange: (profile: Partial<Profile>) => void;
  onGoalsChange: (goals: Partial<Goals>) => void;
  onNotificationsChange: (notifications: Partial<NotificationSettings>) => void;
  onResetData: () => void;
};

export function Settings({ data, onProfileChange, onGoalsChange, onNotificationsChange, onResetData }: SettingsProps) {
  const [notificationMessage, setNotificationMessage] = useState('');
  const proteinRange = estimateProtein(data.profile.weightKg);
  const suggestedGoals = calculateDynamicGoals(data.profile);
  const supportMessage = getNotificationSupportMessage();

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
      <header className="pt-2">
        <p className="text-sm font-semibold text-rose-700">Preferências e metas</p>
        <h1 className="page-title mt-1">Ajustes</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Dados locais salvos no navegador.</p>
      </header>

      <Card>
        <h2 className="section-title">Perfil</h2>
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
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Dias de treino</span>
              <input
                className="input"
                inputMode="numeric"
                value={data.profile.trainingDays}
                onChange={(event) => onProfileChange({ trainingDays: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Dias de cardio</span>
              <input
                className="input"
                inputMode="numeric"
                value={data.profile.cardioDays}
                onChange={(event) => onProfileChange({ cardioDays: Number(event.target.value) || 0 })}
              />
            </label>
          </div>
        </div>
        <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-medium text-teal-800">
          Proteína estimada para o peso atual: {proteinRange.low} a {proteinRange.high} g/dia.
        </p>
      </Card>

      <Card>
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
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <Bell className="text-teal-700" size={20} aria-hidden="true" />
          <h2 className="section-title">Notificações</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          No iPhone, as notificações push funcionam quando o app está instalado na Tela de Início e aberto pelo ícone instalado.
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

      <Card>
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
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button className="secondary-button" type="button" onClick={onResetData}>
          <RotateCcw size={18} aria-hidden="true" />
          Reiniciar
        </button>
        <button className="primary-button" type="button">
          <Save size={18} aria-hidden="true" />
          Salvo local
        </button>
      </div>
    </div>
  );
}
