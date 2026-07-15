import type { User } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export type MigrationResult = 'downloaded' | 'uploaded' | 'empty';
export type ForgetAfterDays = 7 | 30 | 90 | null;

export type AuthContextValue = {
  user: User;
  migrationResult: MigrationResult;
  forgetAfterDays: ForgetAfterDays;
  setForgetAfterDays: (days: ForgetAfterDays) => void;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthGate.');
  }
  return value;
}
