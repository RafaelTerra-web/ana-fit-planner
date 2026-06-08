import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
  tone?: 'rose' | 'teal' | 'amber';
};

const toneClasses = {
  rose: 'bg-rose-50 text-rose-700',
  teal: 'bg-teal-50 text-teal-700',
  amber: 'bg-amber-50 text-amber-700',
};

export function StatCard({ icon: Icon, label, value, helper, tone = 'rose' }: StatCardProps) {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-semibold leading-tight text-slate-950">{value}</p>
          {helper ? <p className="mt-1 text-xs leading-snug text-slate-500">{helper}</p> : null}
        </div>
      </div>
    </Card>
  );
}
