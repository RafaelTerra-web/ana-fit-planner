type ProgressBarProps = {
  value: number;
  label?: string;
  tone?: 'rose' | 'teal' | 'amber';
};

const toneClasses = {
  rose: 'from-rose-500 to-pink-400 shadow-[0_0_18px_rgba(251,113,133,0.28)]',
  teal: 'from-lime-400 to-emerald-300 shadow-[0_0_18px_rgba(190,242,100,0.24)]',
  amber: 'from-amber-400 to-lime-300 shadow-[0_0_18px_rgba(251,191,36,0.22)]',
};

export function ProgressBar({ value, label, tone = 'rose' }: ProgressBarProps) {
  const normalizedValue = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;

  return (
    <div className="space-y-2">
      {label ? (
        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-300">
          <span>{label}</span>
          <span className="shrink-0 tabular-nums text-slate-100">{normalizedValue}%</span>
        </div>
      ) : null}
      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-inset ring-white/5"
        role="progressbar"
        aria-label={label ?? 'Progresso'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalizedValue}
        aria-valuetext={`${normalizedValue}%`}
      >
        <div
          className={`progress-fill h-full rounded-full bg-gradient-to-r ${toneClasses[tone]}`}
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
}
