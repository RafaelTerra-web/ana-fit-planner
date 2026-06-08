import { Activity, Camera, Plus, TrendingUp } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import type { AppData, ProgressEntry } from '../types';
import { suggestCalorieAdjustment } from '../utils/calculations';

type ProgressProps = {
  data: AppData;
  onAddProgress: (entry: ProgressEntry) => void;
};

type ChartProps = {
  label: string;
  unit: string;
  entries: ProgressEntry[];
  getValue: (entry: ProgressEntry) => number;
  color: string;
};

function todayKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function MiniChart({ label, unit, entries, getValue, color }: ChartProps) {
  const points = entries
    .map((entry) => ({ date: entry.date, value: getValue(entry) }))
    .filter((point) => point.value > 0)
    .slice(-8);

  if (points.length < 2) {
    return (
      <Card>
        <h3 className="section-title">{label}</h3>
        <p className="mt-2 text-sm text-slate-500">Registre pelo menos 2 entradas para formar o grafico.</p>
      </Card>
    );
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 280;
  const height = 120;
  const coordinates = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((point.value - min) / range) * (height - 20) - 10;
    return { x, y, ...point };
  });
  const path = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const last = points[points.length - 1];

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="section-title">{label}</h3>
          <p className="mt-1 text-sm text-slate-500">Ultimo registro: {last.value} {unit}</p>
        </div>
        <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{points.length} pontos</span>
      </div>
      <svg className="mt-4 h-32 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Grafico de ${label}`}>
        <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {coordinates.map((point) => (
          <circle cx={point.x} cy={point.y} fill="#ffffff" key={`${point.date}-${point.value}`} r="5" stroke={color} strokeWidth="3" />
        ))}
      </svg>
    </Card>
  );
}

export function Progress({ data, onAddProgress }: ProgressProps) {
  const [form, setForm] = useState({
    date: todayKey(),
    weightKg: String(data.profile.weightKg),
    waistCm: '',
    hipCm: '',
    hipThrustKg: '',
    bulgarianKg: '',
    rdlKg: '',
    trainingFrequency: String(data.profile.trainingDays),
    cardioFrequency: String(data.profile.cardioDays),
    photoDataUrl: '',
  });

  const latestEntry = data.progressEntries[data.progressEntries.length - 1];
  const adjustment = useMemo(() => suggestCalorieAdjustment(data.progressEntries, data.goals), [data.progressEntries, data.goals]);
  const trainingAdherence = latestEntry ? Math.round((latestEntry.trainingFrequency / data.profile.trainingDays) * 100) : 0;
  const cardioAdherence = latestEntry ? Math.round((latestEntry.cardioFrequency / data.profile.cardioDays) * 100) : 0;

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePhoto = (file?: File) => {
    if (!file) {
      updateForm('photoDataUrl', '');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => updateForm('photoDataUrl', String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAddProgress({
      id: crypto.randomUUID(),
      date: form.date,
      weightKg: Number(form.weightKg) || 0,
      waistCm: Number(form.waistCm) || 0,
      hipCm: Number(form.hipCm) || 0,
      hipThrustKg: Number(form.hipThrustKg) || 0,
      bulgarianKg: Number(form.bulgarianKg) || 0,
      rdlKg: Number(form.rdlKg) || 0,
      trainingFrequency: Number(form.trainingFrequency) || 0,
      cardioFrequency: Number(form.cardioFrequency) || 0,
      photoDataUrl: form.photoDataUrl || undefined,
    });
  };

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <p className="text-sm font-semibold text-rose-700">Medidas, cargas e constancia</p>
        <h1 className="page-title mt-1">Progresso</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Acompanhe média de peso, cintura, quadril e cargas principais.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <TrendingUp className="text-rose-700" size={22} aria-hidden="true" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Registros</p>
          <p className="mt-1 text-xl font-extrabold text-slate-950">{data.progressEntries.length}</p>
        </Card>
        <Card className="p-3">
          <Activity className="text-teal-700" size={22} aria-hidden="true" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Hip thrust</p>
          <p className="mt-1 text-xl font-extrabold text-slate-950">{latestEntry?.hipThrustKg || 0} kg</p>
        </Card>
      </div>

      <Card>
        <h2 className="section-title">Aderência registrada</h2>
        <div className="mt-4 space-y-4">
          <ProgressBar value={trainingAdherence} label="Treinos na semana" tone="rose" />
          <ProgressBar value={cardioAdherence} label="Cardios na semana" tone="teal" />
        </div>
      </Card>

      <Card>
        <h2 className="section-title">Novo registro</h2>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            <span>Data</span>
            <input className="input" type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Peso</span>
              <input className="input" inputMode="decimal" value={form.weightKg} onChange={(event) => updateForm('weightKg', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Cintura</span>
              <input className="input" inputMode="decimal" value={form.waistCm} onChange={(event) => updateForm('waistCm', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Quadril</span>
              <input className="input" inputMode="decimal" value={form.hipCm} onChange={(event) => updateForm('hipCm', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Hip thrust</span>
              <input
                className="input"
                inputMode="decimal"
                value={form.hipThrustKg}
                onChange={(event) => updateForm('hipThrustKg', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Búlgaro</span>
              <input
                className="input"
                inputMode="decimal"
                value={form.bulgarianKg}
                onChange={(event) => updateForm('bulgarianKg', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Stiff/RDL</span>
              <input className="input" inputMode="decimal" value={form.rdlKg} onChange={(event) => updateForm('rdlKg', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Treinos</span>
              <input
                className="input"
                inputMode="numeric"
                value={form.trainingFrequency}
                onChange={(event) => updateForm('trainingFrequency', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Cardios</span>
              <input
                className="input"
                inputMode="numeric"
                value={form.cardioFrequency}
                onChange={(event) => updateForm('cardioFrequency', event.target.value)}
              />
            </label>
          </div>
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            <span>Foto local</span>
            <input className="input" type="file" accept="image/*" onChange={(event) => handlePhoto(event.target.files?.[0])} />
          </label>
          {form.photoDataUrl ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <img className="h-48 w-full object-cover" src={form.photoDataUrl} alt="Prévia da foto de progresso" />
            </div>
          ) : null}
          <button className="primary-button w-full" type="submit">
            <Plus size={18} aria-hidden="true" />
            Salvar progresso
          </button>
        </form>
      </Card>

      <MiniChart label="Peso" unit="kg" entries={data.progressEntries} getValue={(entry) => entry.weightKg} color="#be123c" />
      <MiniChart label="Cintura" unit="cm" entries={data.progressEntries} getValue={(entry) => entry.waistCm} color="#0f766e" />
      <MiniChart label="Quadril" unit="cm" entries={data.progressEntries} getValue={(entry) => entry.hipCm} color="#f59e0b" />
      <MiniChart label="Hip thrust" unit="kg" entries={data.progressEntries} getValue={(entry) => entry.hipThrustKg} color="#7c3aed" />

      <Card>
        <div className="flex items-center gap-2">
          <Camera className="text-rose-700" size={20} aria-hidden="true" />
          <h2 className="section-title">Ajuste calórico</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{adjustment}</p>
      </Card>
    </div>
  );
}
