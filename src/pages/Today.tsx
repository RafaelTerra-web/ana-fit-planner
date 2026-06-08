import { ArrowRight, Dumbbell, Utensils } from 'lucide-react';
import type { AppData, AppTab } from '../types';

type TodayProps = {
  data: AppData;
  onSelectTab: (tab: AppTab) => void;
};

export function Today({ data, onSelectTab }: TodayProps) {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col justify-center py-8">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">Ana Fit Planner</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-slate-50">Escolha por onde começar</h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
          Um acesso simples para {data.profile.name}: treino ou dieta, sem painel de numeros na entrada.
        </p>
      </header>

      <section className="grid gap-4" aria-label="Escolha inicial">
        <button
          type="button"
          data-testid="go-workout"
          className="group min-h-44 rounded-lg border border-rose-400/30 bg-gradient-to-br from-rose-500/20 via-slate-900 to-slate-950 p-5 text-left shadow-soft transition active:scale-[0.98]"
          onClick={() => onSelectTab('workout')}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-400 text-[#020617]">
            <Dumbbell size={25} aria-hidden="true" />
          </span>
          <span className="mt-7 block text-2xl font-black text-white">Treino</span>
          <span className="mt-2 flex items-center gap-2 text-sm font-bold text-rose-100">
            Abrir rotina <ArrowRight className="transition group-active:translate-x-1" size={17} aria-hidden="true" />
          </span>
        </button>

        <button
          type="button"
          data-testid="go-diet"
          className="group min-h-44 rounded-lg border border-teal-300/30 bg-gradient-to-br from-teal-400/20 via-slate-900 to-slate-950 p-5 text-left shadow-soft transition active:scale-[0.98]"
          onClick={() => onSelectTab('diet')}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-300 text-[#020617]">
            <Utensils size={25} aria-hidden="true" />
          </span>
          <span className="mt-7 block text-2xl font-black text-white">Dieta</span>
          <span className="mt-2 flex items-center gap-2 text-sm font-bold text-teal-100">
            Abrir plano <ArrowRight className="transition group-active:translate-x-1" size={17} aria-hidden="true" />
          </span>
        </button>
      </section>
    </div>
  );
}
