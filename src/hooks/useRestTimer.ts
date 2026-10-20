import { createContext, useContext } from 'react';

export type RestTimer = {
  alarmId: string;
  exerciseId: string;
  setId?: string;
  exerciseName: string;
  endsAt: number;
  durationSeconds: number;
};

export type RestTimerContextValue = {
  timer: RestTimer | null;
  remainingSeconds: number;
  startRest: (details: { exerciseId: string; setId?: string; exerciseName: string; durationSeconds: number }) => void;
  adjustRest: (deltaSeconds: number) => void;
  skipRest: () => void;
};

export const RestTimerContext = createContext<RestTimerContextValue | null>(null);

export function useRestTimer() {
  const value = useContext(RestTimerContext);
  if (!value) throw new Error('useRestTimer must be used inside RestTimerProvider.');
  return value;
}
