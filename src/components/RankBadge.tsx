import type { RankTierId } from '../types';
import { formatRankName, type RankLevel } from '../utils/ranks';

type RankBadgeProps = {
  level: RankLevel;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

const sizeClasses = {
  xs: {
    wrapper: 'h-9 w-9',
  },
  sm: {
    wrapper: 'h-12 w-12',
  },
  md: {
    wrapper: 'h-16 w-16',
  },
  lg: {
    wrapper: 'h-24 w-24',
  },
  xl: {
    wrapper: 'h-32 w-32',
  },
} as const;

const tierGlowClasses: Record<RankTierId, string> = {
  ferro: 'from-slate-400/25 to-slate-700/5 shadow-slate-400/10',
  bronze: 'from-orange-400/25 to-amber-900/5 shadow-orange-400/10',
  prata: 'from-slate-100/25 to-slate-500/5 shadow-slate-100/10',
  ouro: 'from-amber-300/30 to-yellow-700/5 shadow-amber-300/15',
  platina: 'from-sky-300/25 to-cyan-700/5 shadow-sky-300/15',
  diamante: 'from-cyan-300/25 to-violet-700/10 shadow-cyan-300/15',
  elite: 'from-rose-400/25 to-fuchsia-800/10 shadow-rose-400/15',
  olympia: 'from-amber-200/35 to-orange-700/10 shadow-amber-200/20',
};

export function RankBadge({ level, size = 'md', className = '' }: RankBadgeProps) {
  const classes = sizeClasses[size];
  const accessibleName = formatRankName(level);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b p-1 shadow-lg ${classes.wrapper} ${tierGlowClasses[level.tier]} ${className}`}
    >
      <img
        className="h-full w-full object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.35)]"
        src={level.crestSrc}
        alt={`Brasão do rank ${accessibleName}`}
      />
    </span>
  );
}
