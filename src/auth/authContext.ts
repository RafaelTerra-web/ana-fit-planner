import type { User } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';
import type { AppData } from '../types';

export type MigrationResult = 'downloaded' | 'uploaded' | 'empty';
export type ForgetAfterDays = 7 | 30 | 90 | null;

export type AuthContextValue = {
  user: User | null;
  displayName: string | null;
  cloudEnabled: boolean;
  migrationResult: MigrationResult;
  forgetAfterDays: ForgetAfterDays;
  setForgetAfterDays: (days: ForgetAfterDays) => void;
  markOnboardingComplete: (data: AppData) => Promise<AppData>;
  signOut: () => Promise<void>;
};

function metadataString(user: User, key: string) {
  const value = user.user_metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function getUserDisplayName(user: User | null) {
  if (!user) return null;

  const metadataName = metadataString(user, 'display_name') || metadataString(user, 'full_name') || metadataString(user, 'name');
  if (metadataName) return metadataName;

  const emailName = user.email?.split('@')[0].replace(/[._+-]+/g, ' ').trim();
  if (!emailName) return 'Atleta';

  return emailName
    .split(/\s+/)
    .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1))
    .join(' ');
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthGate.');
  }
  return value;
}
