import { AlertTriangle, BarChart3, ChevronDown } from 'lucide-react';
import type { MuscleGroup } from '../types';
import { formatVolume, getVolumeStatus, muscleOptions, volumeTargets } from '../utils/workoutVolume';

type WorkoutVolumePanelProps = {
  volume: Record<MuscleGroup, number>;
};

const statusToneClasses = {
  slate: 'border-slate-500/20 bg-white/5 text-slate-300',
  teal: 'border-teal-400/25 bg-teal-400/10 text-teal-100',
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  rose: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
};

const barToneClasses = {
  slate: 'bg-slate-500',
  teal: 'bg-teal-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
};

export function WorkoutVolumePanel({ volume }: WorkoutVolumePanelProps) {
  const activeRows = muscleOptions.filter(
    (option) => volume[option.value] > 0 || option.value === 'quadriceps' || option.value === 'glutes'
  );
  const highVolumeRows = activeRows.filter((option) => getVolumeStatus(option.value, volume[option.value]).level === 'high');

  return (
    <details className="manage-plan overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-900/65">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-300/10 text-teal-200">
          <BarChart3 size={19} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-slate-100">Volume semanal</span>
          <span className="mt-0.5 block text-xs font-semibold text-slate-500">Confira a distribuição antes de aumentar as séries</span>
        </span>
        {highVolumeRows.length ? <AlertTriangle className="shrink-0 text-rose-300" size={19} aria-label="Há volume alto" /> : null}
        <ChevronDown className="manage-chevron shrink-0 text-slate-500 transition" size={19} aria-hidden="true" />
      </summary>

      <div className="space-y-3 border-t border-white/10 p-3">
        <p className="text-xs font-semibold leading-relaxed text-slate-500">
          Músculo principal conta 1 série; secundário conta 0,5.
        </p>
        {activeRows.map((option) => {
          const currentVolume = volume[option.value];
          const target = volumeTargets[option.value];
          const status = getVolumeStatus(option.value, currentVolume);
          const barWidth = `${Math.min(100, Math.round((currentVolume / 15) * 100))}%`;

          return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3" key={option.value}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-100">{option.label}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Alvo {target.min}–{target.max} séries</p>
                </div>
                <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${statusToneClasses[status.tone]}`}>
                  {formatVolume(currentVolume)}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${barToneClasses[status.tone]}`} style={{ width: barWidth }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-400">{status.message}</p>
            </div>
          );
        })}
      </div>
    </details>
  );
}
