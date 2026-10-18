import type { AppData } from '../types';
import { getLocalDateKey } from './workoutSessions';

function download(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadAppBackup(data: AppData) {
  download(
    JSON.stringify({ app: 'Ana Fit Planner', exportedAt: new Date().toISOString(), data }, null, 2),
    `ana-fit-backup-${getLocalDateKey()}.json`,
    'application/json;charset=utf-8',
  );
}

// Keep user supplied notes/names as text when spreadsheet software opens the CSV.
export function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function createWorkoutCsv(data: Pick<AppData, 'workoutSessions'>) {
  const rows: unknown[][] = [
    [
      'Data',
      'Treino',
      'Exercício',
      'Série',
      'Carga (kg)',
      'Repetições',
      'RIR',
      'Concluída',
      'Sessão finalizada',
      'Observação',
    ],
  ];
  Object.values(data.workoutSessions)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .forEach((session) => {
      session.exerciseOrder.forEach((id) => {
        const log = session.exerciseLogs[id];
        log?.sets.forEach((set, index) =>
          rows.push([
            session.dateKey,
            session.workoutTitle,
            log.exerciseName,
            index + 1,
            set.weight,
            set.reps,
            set.rir,
            set.completed ? 'Sim' : 'Não',
            session.completedAt ? 'Sim' : 'Não',
            log.note,
          ]),
        );
      });
    });
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
}

export function downloadWorkoutCsv(data: AppData) {
  download(createWorkoutCsv(data), `ana-fit-series-${getLocalDateKey()}.csv`, 'text/csv;charset=utf-8');
}
