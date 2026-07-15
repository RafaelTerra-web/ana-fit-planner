import { ChevronRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { RankState } from '../types';
import { formatRankName, getRankInactivityStatus, getRankProgress, totalRankXp } from '../utils/ranks';
import { RankBadge } from './RankBadge';

type RankCardProps = {
  rank: RankState;
  variant?: 'compact' | 'hero';
  onClick?: () => void;
  className?: string;
};

const numberFormatter = new Intl.NumberFormat('pt-BR');

export function RankCard({ rank, variant = 'compact', onClick, className = '' }: RankCardProps) {
  const progress = getRankProgress(totalRankXp(rank));
  const currentName = formatRankName(progress.current);
  const nextName = progress.next ? formatRankName(progress.next) : null;
  const inactivity = getRankInactivityStatus(rank);
  const protectionText = progress.totalXp === 0
    ? 'Sem XP em risco'
    : inactivity.isProtected
      ? `${inactivity.daysUntilNextDecay} ${inactivity.daysUntilNextDecay === 1 ? 'dia' : 'dias'} de proteção`
      : `Queda ativa · -${numberFormatter.format(inactivity.nextDecayXp)} XP em ${inactivity.daysUntilNextDecay} ${inactivity.daysUntilNextDecay === 1 ? 'dia' : 'dias'}`;
  const ProtectionIcon = inactivity.isProtected || progress.totalXp === 0 ? ShieldCheck : ShieldAlert;
  const interactiveClasses = onClick ? 'relative transition hover:border-white/20 active:scale-[0.99]' : '';
  const containerClasses = `w-full rounded-lg border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-soft ${interactiveClasses} ${
    variant === 'hero' ? 'p-5' : 'p-4'
  } ${className}`;

  const progressBar = (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-400">
        <span>{nextName ? `${numberFormatter.format(progress.xpToNext)} XP para ${nextName}` : 'Topo da jornada alcançado'}</span>
        <span>{progress.percent}%</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-label={nextName ? `Progresso para ${nextName}` : 'Jornada de ranks concluída'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-amber-300 transition-[width] duration-500"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className={`mt-2 flex items-center gap-1.5 text-[0.68rem] font-bold ${inactivity.isProtected || progress.totalXp === 0 ? 'text-teal-300' : 'text-amber-200'}`}>
        <ProtectionIcon size={13} aria-hidden="true" /> {protectionText}
      </p>
    </div>
  );

  const content =
    variant === 'hero' ? (
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-300">Seu rank atual</p>
        <div className="mt-3 flex justify-center">
          <RankBadge level={progress.current} size="xl" />
        </div>
        <h2 className="mt-3 text-2xl font-black text-white">{currentName}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-400">{numberFormatter.format(progress.totalXp)} XP acumulados</p>
        {progressBar}
        {onClick ? (
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-teal-300">
            Ver jornada completa <ChevronRight size={17} aria-hidden="true" />
          </span>
        ) : null}
      </div>
    ) : (
      <div className="flex items-center gap-3">
        <RankBadge level={progress.current} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-teal-300">Rank atual</p>
              <h2 className="mt-0.5 text-lg font-black text-white">{currentName}</h2>
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-400">{numberFormatter.format(progress.totalXp)} XP</span>
          </div>
          {progressBar}
        </div>
        {onClick ? <ChevronRight className="shrink-0 text-slate-500" size={20} aria-hidden="true" /> : null}
      </div>
    );

  const accessibleLabel = nextName
    ? `${currentName}, ${numberFormatter.format(progress.totalXp)} XP. Faltam ${numberFormatter.format(progress.xpToNext)} XP para ${nextName}. ${protectionText}.`
    : `${currentName}, rank máximo, ${numberFormatter.format(progress.totalXp)} XP. ${protectionText}.`;

  return (
    <section className={containerClasses} aria-label={onClick ? undefined : accessibleLabel}>
      {onClick ? (
        <button
          type="button"
          className="absolute inset-0 z-10 cursor-pointer rounded-lg transition hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          onClick={onClick}
          aria-label={accessibleLabel}
        />
      ) : null}
      <div className={onClick ? 'pointer-events-none relative' : ''}>{content}</div>
    </section>
  );
}
