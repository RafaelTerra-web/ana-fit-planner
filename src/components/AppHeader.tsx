import { Activity, ArrowUpRight, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import type { AppTab } from '../types';
import type { CloudSyncStatus } from '../hooks/useCloudSync';

const labels: Record<AppTab, string> = {
  today: 'Visão geral',
  workout: 'Seus treinos',
  diet: 'Alimentação',
  progress: 'Sua evolução',
  settings: 'Ajustes',
};
const syncLabels: Record<CloudSyncStatus, string> = {
  local: 'Salvo neste aparelho',
  saved: 'Sincronizado',
  saving: 'Salvando…',
  offline: 'Salvo offline',
  error: 'Revisar sincronização',
};

export function AppHeader({
  activeTab,
  profileName,
  syncStatus,
  onSelectTab,
}: {
  activeTab: AppTab;
  profileName: string;
  syncStatus: CloudSyncStatus;
  onSelectTab: (tab: AppTab) => void;
}) {
  return (
    <header className="app-topbar">
      <button
        className="app-brand"
        type="button"
        aria-label="Ana Fit, voltar ao início"
        onClick={() => onSelectTab('today')}
      >
        <span className="app-brand-icon">
          <Activity size={24} strokeWidth={2.8} aria-hidden="true" />
        </span>
        <span>
          ana<span className="app-brand-accent">fit</span>
          <small>seu ritmo. sua evolução.</small>
        </span>
      </button>
      <p className="app-location">
        Seu espaço <span>/</span> <strong>{labels[activeTab]}</strong>
      </p>
      <div className="app-topbar-actions">
        <button
          type="button"
          className={`sync-indicator sync-indicator--${syncStatus}`}
          onClick={() => onSelectTab('settings')}
          aria-label={`${syncLabels[syncStatus]}. Abrir ajustes`}
        >
          {syncStatus === 'offline' || syncStatus === 'error' ? (
            <CloudOff size={15} />
          ) : syncStatus === 'saving' ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Cloud size={15} />
          )}
          <span>{syncLabels[syncStatus]}</span>
        </button>
        <button
          type="button"
          className="app-avatar"
          onClick={() => onSelectTab('settings')}
          aria-label={`Perfil de ${profileName}`}
        >
          {profileName.trim().slice(0, 1).toLocaleUpperCase('pt-BR') || 'A'}
          <ArrowUpRight size={10} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
