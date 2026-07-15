import {
  Check,
  ChevronsDown,
  Crown,
  Dumbbell,
  Footprints,
  GlassWater,
  HeartPulse,
  RefreshCcw,
  Salad,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { RankState } from '../types';
import {
  RANK_LEVELS,
  RANK_TIERS,
  formatRankName,
  getDivisionRoman,
  getRankProgress,
  totalRankXp,
} from '../utils/ranks';
import { Card } from './Card';
import { RankBadge } from './RankBadge';

type RankJourneyProps = {
  rank: RankState;
  className?: string;
};

const numberFormatter = new Intl.NumberFormat('pt-BR');

const xpActions = [
  { label: 'Treino finalizado', detail: '60 a 100 XP', icon: Dumbbell, tone: 'text-rose-300 bg-rose-400/10' },
  { label: 'Cardio programado', detail: '35 XP', icon: HeartPulse, tone: 'text-teal-300 bg-teal-400/10' },
  { label: '80% das refeições', detail: '30 XP', icon: Salad, tone: 'text-emerald-300 bg-emerald-400/10' },
  { label: 'Meta de água', detail: '10 XP', icon: GlassWater, tone: 'text-sky-300 bg-sky-400/10' },
  { label: 'Meta de passos', detail: '10 XP', icon: Footprints, tone: 'text-amber-300 bg-amber-400/10' },
  { label: 'Check-in semanal', detail: '40 XP', icon: TrendingUp, tone: 'text-violet-300 bg-violet-400/10' },
] as const;

export function RankJourney({ rank, className = '' }: RankJourneyProps) {
  const totalXp = totalRankXp(rank);
  const progress = getRankProgress(totalXp);

  return (
    <section className={`space-y-4 ${className}`} aria-labelledby="rank-journey-title">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-300">Ferro ao Olympia</p>
        <h2 className="mt-1 text-xl font-black text-white" id="rank-journey-title">
          Jornada de ranks
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Cada rank avança de I para II e III. Sua constância libera o próximo brasão até o Olympia III, o cume da jornada.
        </p>
      </div>

      <Card className="overflow-hidden border-amber-300/20 bg-gradient-to-br from-amber-300/[0.09] via-slate-900 to-slate-950">
        <section aria-labelledby="xp-protection-title">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-200" aria-hidden="true">
              <ShieldCheck size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-amber-200">Proteção de XP</p>
              <h3 className="mt-1 text-lg font-black leading-tight text-white" id="xp-protection-title">
                14 dias sem nenhuma perda
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Treino válido, cardio programado, alimentação em 80% ou check-in reiniciam a proteção por 14 dias.
              </p>
            </div>
          </div>

          <ol className="mt-4 space-y-2.5" aria-label="Regras de proteção e perda de XP">
            <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <RefreshCcw className="mt-0.5 shrink-0 text-teal-300" size={18} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-100">Só esses ganhos reiniciam o prazo</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-400">Água e passos continuam dando XP, mas sozinhos não abrem uma nova proteção.</p>
              </div>
            </li>
            <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <TrendingDown className="mt-0.5 shrink-0 text-amber-200" size={18} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-100">Depois, a perda é semanal</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-400">
                  A cada 7 dias, são descontados 2% do XP atual: no mínimo 50 e no máximo 300 XP.
                </p>
              </div>
            </li>
            <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <ChevronsDown className="mt-0.5 shrink-0 text-rose-300" size={18} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-100">O rank acompanha o saldo</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-400">A redução pode fazer você cair de divisão ou de rank.</p>
              </div>
            </li>
          </ol>

          <div className="mt-3 rounded-2xl border border-teal-300/15 bg-teal-300/[0.07] p-3" role="note" aria-label="O que não causa perda de XP">
            <p className="text-sm font-extrabold text-teal-100">Um dia isolado nunca gera punição</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-300">
              Peso corporal, cargas do treino e passar um dia sem atividade não reduzem XP.
            </p>
          </div>
        </section>
      </Card>

      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" aria-label="Todos os ranks e divisões">
        {RANK_TIERS.map((tier) => {
          const levels = RANK_LEVELS.filter((level) => level.tier === tier.id);
          const currentTier = progress.current.tier === tier.id;
          const entryLevel = levels[0];
          const tierUnlocked = totalXp >= entryLevel.minXp;

          return (
            <li
              className={`relative overflow-hidden rounded-lg border p-3 text-center transition ${
                currentTier
                  ? 'border-teal-300/60 bg-teal-400/10 shadow-[0_0_24px_rgba(45,212,191,0.12)]'
                  : tierUnlocked
                    ? 'border-white/15 bg-white/5'
                    : 'border-white/5 bg-slate-950/50 opacity-60'
              }`}
              key={tier.id}
            >
              {currentTier ? (
                <span className="absolute right-2 top-2 rounded-full bg-teal-300 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-wide text-slate-950">
                  Atual
                </span>
              ) : null}
              <h3 className="mt-1 text-sm font-black text-white">{tier.label}</h3>
              <p className="mt-0.5 text-[0.65rem] font-semibold text-slate-500">A partir de {numberFormatter.format(entryLevel.minXp)} XP</p>

              <div className="mt-3 grid grid-cols-3 gap-1" role="list" aria-label={`Brasões e divisões do rank ${tier.label}`}>
                {levels.map((level) => {
                  const isCurrent = level.id === progress.current.id;
                  const isUnlocked = totalXp >= level.minXp;
                  const isOlympiaFinal = level.id === 'olympia-3';

                  return (
                    <span
                      aria-current={isCurrent ? 'step' : undefined}
                      aria-label={`${formatRankName(level)}, ${numberFormatter.format(level.minXp)} XP${isCurrent ? ', rank atual' : isUnlocked ? ', liberado' : ', bloqueado'}`}
                      className={`flex min-w-0 flex-col items-center justify-center rounded-lg border px-0.5 py-1.5 text-xs font-black ${
                        isOlympiaFinal
                          ? isCurrent
                            ? 'border-amber-200/90 bg-gradient-to-b from-amber-300/25 via-violet-400/15 to-amber-200/10 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.28)]'
                            : isUnlocked
                              ? 'border-amber-200/50 bg-amber-300/10 text-amber-100'
                              : 'border-amber-200/20 bg-amber-300/[0.045] text-amber-100/50'
                          : isCurrent
                            ? 'border-teal-300 bg-teal-300/15 text-teal-100'
                            : isUnlocked
                              ? 'border-white/15 bg-white/10 text-white'
                              : 'border-white/5 bg-slate-950/60 text-slate-600'
                      }`}
                      key={level.id}
                      role="listitem"
                      title={`${numberFormatter.format(level.minXp)} XP${isOlympiaFinal ? ' · Cume da jornada' : ''}`}
                    >
                      <RankBadge className={isUnlocked ? '' : 'grayscale'} level={level} size="xs" />
                      <span className="mt-0.5 flex items-center gap-0.5">
                        {isUnlocked && !isCurrent ? <Check size={9} aria-hidden="true" /> : null}
                        {isOlympiaFinal ? <Crown size={9} aria-hidden="true" /> : null}
                        {getDivisionRoman(level.division)}
                      </span>
                    </span>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <Card>
        <h3 className="section-title">Como ganhar XP</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          O rank premia consistência. Carga, peso corporal e medidas não geram pontos.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2" aria-label="Ações que concedem experiência">
          {xpActions.map(({ label, detail, icon: Icon, tone }) => (
            <li className="rounded-lg border border-white/10 bg-white/5 p-3" key={label}>
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
                <Icon size={17} aria-hidden="true" />
              </span>
              <p className="mt-2 text-xs font-bold leading-tight text-slate-100">{label}</p>
              <p className="mt-1 text-[0.68rem] font-black uppercase tracking-wide text-teal-300">+{detail}</p>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
