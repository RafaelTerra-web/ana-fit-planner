import { Activity, Dumbbell, Home, Settings, Utensils, Heart } from 'lucide-react';
import type { AppTab } from '../types';

type BottomNavProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const items: Array<{ id: AppTab; label: string; icon: typeof Home }> = [
  { id: 'today', label: 'Início', icon: Home },
  { id: 'workout', label: 'Treinos', icon: Dumbbell },
  { id: 'diet', label: 'Alimentação', icon: Utensils },
  { id: 'progress', label: 'Evolução', icon: Activity },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal" data-tour="bottom-nav">
      <p className="nav-eyebrow">SUA ROTINA</p>
      <div className="bottom-nav-shell">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              className={`bottom-nav-item ${isActive ? 'is-active' : ''}`}
              type="button"
              data-testid={`nav-${item.id}`}
              key={item.id}
              onClick={() => onChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-item-icon" aria-hidden="true">
                <Icon size={19} strokeWidth={isActive ? 2.35 : 2} />
              </span>
              <span className="max-w-full truncate px-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="nav-note">
        <Heart size={20} aria-hidden="true" />
        <strong>Um treino de cada vez.</strong>
        <p>
          Pequenos passos também
          <br />
          constroem grandes mudanças.
        </p>
        <span>ANA FIT PLANNER</span>
      </div>
    </nav>
  );
}
