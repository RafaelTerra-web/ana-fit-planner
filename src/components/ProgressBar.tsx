type ProgressBarProps = {
  value: number;
  label?: string;
  tone?: 'rose' | 'teal' | 'amber';
};

const toneClasses = {
  rose: 'bg-rose-600',
  teal: 'bg-teal-700',
  amber: 'bg-amber-500',
};

export function ProgressBar({ value, label, tone = 'rose' }: ProgressBarProps) {
  const normalizedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="space-y-2">
      {label ? (
        <div className="flex items-center justify-between text-sm font-medium text-slate-700">
          <span>{label}</span>
          <span>{normalizedValue}%</span>
        </div>
      ) : null}
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${toneClasses[tone]}`} style={{ width: `${normalizedValue}%` }} />
      </div>
    </div>
  );
}
