import { Bike, Check, HeartPulse, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { CardioEntry } from '../types';
import { cardioActivities, isValidLocalDate } from '../utils/cardio';
import { getLocalDateKey } from '../utils/workoutSessions';

type Props = {
  entries: CardioEntry[];
  onAddEntry: (entry: CardioEntry) => void;
  onRemoveEntry: (id: string) => void;
};

export function CardioJournal({ entries, onAddEntry, onRemoveEntry }: Props) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: getLocalDateKey(),
    activity: 'walk' as CardioEntry['activity'],
    duration: '',
    distance: '',
    note: '',
  });
  const ordered = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const visible = showAll ? ordered : ordered.slice(0, 3);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const duration = Number(form.duration.replace(',', '.'));
    const distance = Number(form.distance.replace(',', '.'));
    if (
      !isValidLocalDate(form.date) ||
      form.date > getLocalDateKey() ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 1440 ||
      (form.distance && (!Number.isFinite(distance) || distance <= 0 || distance > 1000))
    ) {
      setError('Confira a data, o tempo (maior que zero e até 1.440 min) e a distância.');
      return;
    }
    onAddEntry({
      id: crypto.randomUUID(),
      date: form.date,
      activity: form.activity,
      durationMinutes: duration,
      ...(distance > 0 ? { distanceKm: distance } : {}),
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
    });
    setForm({
      date: getLocalDateKey(),
      activity: 'walk',
      duration: '',
      distance: '',
      note: '',
    });
    setError('');
    setOpen(false);
    setSaved(true);
  };
  return (
    <section className="cardio-journal" aria-labelledby="cardio-title" id="cardio-journal">
      <div className="utility-section-heading">
        <div>
          <p className="eyebrow">Além da musculação</p>
          <h2 className="section-title" id="cardio-title">
            Seu cardio também conta
          </h2>
        </div>
        <span className="utility-icon">
          <HeartPulse size={22} aria-hidden="true" />
        </span>
      </div>
      <p className="utility-description">Guarde o tempo, a distância e como você se sentiu.</p>
      {saved && (
        <p className="utility-success" role="status">
          <Check size={16} /> Cardio registrado no seu histórico.
        </p>
      )}
      <button
        className="secondary-button w-full mt-4"
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setSaved(false);
        }}
      >
        {open ? <X size={17} /> : <Plus size={17} />} {open ? 'Fechar registro' : 'Registrar cardio'}
      </button>
      {open && (
        <form className="cardio-form" onSubmit={submit}>
          <label>
            Atividade
            <select
              className="input"
              value={form.activity}
              onChange={(e) =>
                setForm({
                  ...form,
                  activity: e.target.value as CardioEntry['activity'],
                })
              }
            >
              {Object.entries(cardioActivities).map(([id, label]) => (
                <option value={id} key={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data
            <input
              className="input"
              type="date"
              required
              max={getLocalDateKey()}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label>
            Tempo (min)
            <input
              className="input"
              inputMode="decimal"
              required
              placeholder="30"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
          </label>
          <label>
            Distância (km) · opcional
            <input
              className="input"
              inputMode="decimal"
              placeholder="3,5"
              value={form.distance}
              onChange={(e) => setForm({ ...form, distance: e.target.value })}
            />
          </label>
          <label className="cardio-form-wide">
            Observação · opcional
            <input
              className="input"
              maxLength={500}
              placeholder="Ritmo leve, ao ar livre…"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>
          {error && (
            <p className="cardio-form-wide utility-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button cardio-form-wide" type="submit">
            <Check size={17} /> Salvar cardio
          </button>
          <p className="cardio-form-wide utility-fine-print">
            Se houver cardio programado para hoje, sua meta do dia será marcada ao salvar.
          </p>
        </form>
      )}
      {visible.length ? (
        <div className="cardio-history">
          {visible.map((entry) => (
            <article key={entry.id} className="cardio-history-row">
              <span className="utility-icon">
                <Bike size={18} aria-hidden="true" />
              </span>
              <div>
                <strong>{cardioActivities[entry.activity]}</strong>
                <p>
                  {new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                  }).format(new Date(`${entry.date}T12:00:00`))}{' '}
                  · {entry.durationMinutes} min
                  {entry.distanceKm ? ` · ${entry.distanceKm} km` : ''}
                </p>
                {entry.note && <p>{entry.note}</p>}
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={`Excluir ${cardioActivities[entry.activity]} de ${entry.date}`}
                onClick={() => {
                  if (window.confirm('Excluir este registro de cardio?')) onRemoveEntry(entry.id);
                }}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
          {ordered.length > 3 && (
            <button className="text-button" type="button" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Mostrar menos' : `Ver os ${ordered.length} registros`}
            </button>
          )}
        </div>
      ) : (
        <div className="utility-empty">
          <HeartPulse size={22} />
          <span>Sua próxima caminhada pode ser o primeiro registro.</span>
        </div>
      )}
    </section>
  );
}
