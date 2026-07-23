import { Activity, Dumbbell, Home, Settings, Utensils } from 'lucide-react';
import type { AppTab } from '../types';

type BottomNavProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const items: Array<{ id: AppTab; label: string; icon: typeof Home }> = [
  { id: 'today', label: 'Início', icon: Home },
  { id: 'workout', label: 'Treino', icon: Dumbbell },
  { id: 'diet', label: 'Dieta', icon: Utensils },
  { id: 'progress', label: 'Progresso', icon: Activity },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav fixed inset-x-3 z-30" aria-label="Navegação principal" data-tour="bottom-nav">
      <div className="bottom-nav-shell mx-auto grid max-w-md grid-cols-5 gap-1 p-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              className={`bottom-nav-item flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1rem] px-1 text-[0.7rem] font-bold leading-none transition ${
                isActive
                  ? 'bg-lime-300/10 text-lime-200 shadow-[inset_0_0_0_1px_rgba(190,242,100,0.08)]'
                  : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
              }`}
              type="button"
              data-testid={`nav-${item.id}`}
              key={item.id}
              onClick={() => onChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-xl transition ${
                  isActive ? 'bg-lime-300 text-slate-950 shadow-[0_6px_18px_rgba(190,242,100,0.24)]' : ''
                }`}
                aria-hidden="true"
              >
                <Icon size={19} strokeWidth={isActive ? 2.35 : 2} />
              </span>
              <span className="max-w-full truncate px-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
