import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { defaultGoals, defaultMeals, defaultProfile } from './data/dietPlan';
import { getTodayPlan } from './data/workoutPlan';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Diet } from './pages/Diet';
import { Progress } from './pages/Progress';
import { Settings } from './pages/Settings';
import { Today } from './pages/Today';
import { Workout } from './pages/Workout';
import type {
  AppData,
  AppTab,
  DailyChecks,
  ExerciseLog,
  Goals,
  LegacyExerciseLog,
  Meal,
  Profile,
  ProgressEntry,
  WeekPlanItem,
  Workout as WorkoutPlan,
} from './types';
import { calculateDynamicGoals, calculateMealPlan } from './utils/dietCalculator';
import { createDefaultNotificationSettings } from './utils/notifications';
import {
  applyRankInactivityDecay,
  claimRankEvent,
  createInitialRankState,
  createRankEvent,
  normalizeRankState,
} from './utils/ranks';
import {
  createWorkoutSession,
  getLocalDateKey,
  getWorkoutSessionId,
  getWorkoutSessionProgress,
  normalizeWorkoutSessions,
  reconcileWorkoutSession,
} from './utils/workoutSessions';
import { createDefaultWeekPlan, createDefaultWorkouts, normalizeWorkoutData } from './utils/workoutVolume';

const STORAGE_KEY = 'ana-fit-planner:data:v5';
const LEGACY_STORAGE_KEY = 'ana-fit-planner:data:v4';

const tabs: AppTab[] = ['today', 'workout', 'diet', 'progress', 'settings'];

function getInitialTab(): AppTab {
  const tab = new URLSearchParams(window.location.search).get('tab') as AppTab | null;
  return tab && tabs.includes(tab) ? tab : 'today';
}

function createDailyChecks(meals: Meal[]): DailyChecks {
  return {
    trainingDone: false,
    cardioDone: false,
    waterDone: false,
    stepsDone: false,
    meals: Object.fromEntries(meals.map((meal) => [meal.id, false])),
  };
}

function createInitialData(): AppData {
  const dateKey = getLocalDateKey();
  return {
    schemaVersion: 5,
    profile: defaultProfile,
    goals: defaultGoals,
    meals: defaultMeals,
    notifications: createDefaultNotificationSettings(),
    workouts: createDefaultWorkouts(),
    weekPlan: createDefaultWeekPlan(),
    dailyChecks: {
      [dateKey]: createDailyChecks(defaultMeals),
    },
    exerciseLogs: {},
    workoutSessions: {},
    activeWorkoutSessionId: null,
    rank: createInitialRankState(),
    progressEntries: [],
  };
}

function getInitialStoredData() {
  if (typeof window === 'undefined') {
    return createInitialData();
  }

  try {
    const legacyValue = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return legacyValue ? (JSON.parse(legacyValue) as unknown) : createInitialData();
  } catch {
    return createInitialData();
  }
}

function normalizeDailyChecks(checks: DailyChecks | undefined, meals: Meal[]): DailyChecks {
  const mealChecks = Object.fromEntries(meals.map((meal) => [meal.id, Boolean(checks?.meals?.[meal.id])]));

  return {
    trainingDone: Boolean(checks?.trainingDone),
    cardioDone: Boolean(checks?.cardioDone),
    waterDone: Boolean(checks?.waterDone),
    stepsDone: Boolean(checks?.stepsDone),
    meals: mealChecks,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeAppData(value: unknown): AppData {
  const fallback = createInitialData();

  if (!isRecord(value)) {
    return fallback;
  }

  const profile = isRecord(value.profile) ? value.profile : {};
  const goals = isRecord(value.goals) ? value.goals : {};
  const notifications = isRecord(value.notifications) ? value.notifications : {};
  const normalizedWorkoutData = normalizeWorkoutData({
    ...fallback,
    schemaVersion: 5,
    profile: {
      ...fallback.profile,
      ...profile,
      theme: 'dark',
    },
    goals: {
      ...fallback.goals,
      ...goals,
    },
    meals: Array.isArray(value.meals) ? (value.meals as Meal[]) : fallback.meals,
    notifications: {
      ...fallback.notifications,
      ...notifications,
    },
    workouts: Array.isArray(value.workouts) ? (value.workouts as WorkoutPlan[]) : fallback.workouts,
    weekPlan: Array.isArray(value.weekPlan) ? (value.weekPlan as WeekPlanItem[]) : fallback.weekPlan,
    dailyChecks: isRecord(value.dailyChecks) ? (value.dailyChecks as Record<string, DailyChecks>) : fallback.dailyChecks,
    exerciseLogs: isRecord(value.exerciseLogs) ? (value.exerciseLogs as Record<string, LegacyExerciseLog>) : {},
    workoutSessions: {},
    activeWorkoutSessionId: null,
    rank: normalizeRankState(value.rank),
    progressEntries: Array.isArray(value.progressEntries) ? (value.progressEntries as ProgressEntry[]) : fallback.progressEntries,
  });

  const workoutSessions = normalizeWorkoutSessions(value.workoutSessions, normalizedWorkoutData.workouts);
  const storedActiveSessionId = typeof value.activeWorkoutSessionId === 'string' ? value.activeWorkoutSessionId : null;
  const storedActiveSession = storedActiveSessionId ? workoutSessions[storedActiveSessionId] : undefined;
  const migratedActiveSession =
    !('activeWorkoutSessionId' in value)
      ? Object.values(workoutSessions)
          .filter(
            (session) =>
              !session.completedAt && normalizedWorkoutData.workouts.some((workout) => workout.id === session.workoutId)
          )
          .sort((first, second) => Date.parse(second.startedAt) - Date.parse(first.startedAt))[0]
      : undefined;

  return {
    ...normalizedWorkoutData,
    workoutSessions,
    activeWorkoutSessionId:
      storedActiveSession && !storedActiveSession.completedAt ? storedActiveSession.id : migratedActiveSession?.id ?? null,
  };
}

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(getInitialTab);
  const [dateKey, setDateKey] = useState(getLocalDateKey);
  const [storedData, setStoredData] = useLocalStorage<unknown>(STORAGE_KEY, getInitialStoredData);
  const normalizedData = useMemo(() => normalizeAppData(storedData), [storedData]);
  const data = useMemo(() => {
    const rank = applyRankInactivityDecay(normalizedData.rank);
    return rank === normalizedData.rank ? normalizedData : { ...normalizedData, rank };
  }, [normalizedData]);
  const notifications = data.notifications ?? createDefaultNotificationSettings();
  const todayPlan = getTodayPlan(data.weekPlan);
  const todayChecks = normalizeDailyChecks(data.dailyChecks[dateKey], data.meals);

  useEffect(() => {
    const storedRank = isRecord(storedData) ? storedData.rank : undefined;
    if (
      !isRecord(storedData) ||
      storedData.schemaVersion !== 5 ||
      JSON.stringify(storedRank) !== JSON.stringify(data.rank)
    ) {
      setStoredData(data);
    }
  }, [data, setStoredData, storedData]);

  useEffect(() => {
    const handlePopState = () => setActiveTab(getInitialTab());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let midnightTimer = 0;

    const scheduleMidnightUpdate = () => {
      window.clearTimeout(midnightTimer);
      const now = new Date();
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      midnightTimer = window.setTimeout(() => {
        setDateKey(getLocalDateKey());
        scheduleMidnightUpdate();
      }, Math.max(1_000, nextDay.getTime() - now.getTime() + 100));
    };

    const syncCurrentDate = () => {
      setDateKey(getLocalDateKey());
      setStoredData((current: unknown) => {
        const normalized = normalizeAppData(current);
        const rank = applyRankInactivityDecay(normalized.rank);
        return rank === normalized.rank ? current : { ...normalized, rank };
      });
      scheduleMidnightUpdate();
    };

    scheduleMidnightUpdate();
    window.addEventListener('focus', syncCurrentDate);
    document.addEventListener('visibilitychange', syncCurrentDate);
    return () => {
      window.clearTimeout(midnightTimer);
      window.removeEventListener('focus', syncCurrentDate);
      document.removeEventListener('visibilitychange', syncCurrentDate);
    };
  }, [setStoredData]);

  const changeTab = (tab: AppTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'today') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.pushState({ tab }, '', `${url.pathname}${url.search}${url.hash}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateData = (updater: (current: AppData) => AppData) => {
    setStoredData((current: unknown) => {
      const normalized = normalizeAppData(current);
      const rank = applyRankInactivityDecay(normalized.rank);
      const currentWithDecay = rank === normalized.rank ? normalized : { ...normalized, rank };
      return normalizeAppData(updater(currentWithDecay));
    });
  };

  const getActionDateKey = () => {
    const currentDateKey = getLocalDateKey();
    setDateKey(currentDateKey);
    return currentDateKey;
  };

  const toggleCheck = (key: keyof Omit<DailyChecks, 'meals'>) => {
    const actionDateKey = getActionDateKey();
    updateData((current) => {
      const currentChecks = normalizeDailyChecks(current.dailyChecks[actionDateKey], current.meals);
      const nextValue = !currentChecks[key];
      let rank = current.rank;

      if (nextValue && key !== 'trainingDone') {
        const kind = key === 'cardioDone' ? 'cardio' : key === 'waterDone' ? 'water' : 'steps';
        const canClaim = kind !== 'cardio' || Boolean(getTodayPlan(current.weekPlan).cardio);
        if (canClaim && actionDateKey >= rank.startedOn) {
          rank = claimRankEvent(
            rank,
            createRankEvent({ kind, dateKey: actionDateKey, sourceId: `${kind}:${actionDateKey}` })
          );
        }
      }

      return {
        ...current,
        rank,
        dailyChecks: {
          ...current.dailyChecks,
          [actionDateKey]: { ...currentChecks, [key]: nextValue },
        },
      };
    });
  };

  const toggleMeal = (mealId: string) => {
    const actionDateKey = getActionDateKey();
    updateData((current) => {
      const checks = normalizeDailyChecks(current.dailyChecks[actionDateKey], current.meals);
      const nextMeals = { ...checks.meals, [mealId]: !checks.meals[mealId] };
      const completedMeals = current.meals.filter((meal) => nextMeals[meal.id]).length;
      const nutritionCompleted = current.meals.length > 0 && completedMeals / current.meals.length >= 0.8;
      let rank = current.rank;

      if (nutritionCompleted && actionDateKey >= rank.startedOn) {
        rank = claimRankEvent(
          rank,
          createRankEvent({ kind: 'nutrition', dateKey: actionDateKey, sourceId: `nutrition:${actionDateKey}` })
        );
      }

      return {
        ...current,
        rank,
        dailyChecks: {
          ...current.dailyChecks,
          [actionDateKey]: { ...checks, meals: nextMeals },
        },
      };
    });
  };

  const startWorkoutSession = (workoutId: string) => {
    const actionDateKey = getActionDateKey();
    updateData((current) => {
      const workout = current.workouts.find((item) => item.id === workoutId);
      if (!workout) {
        return current;
      }

      const sessionId = getWorkoutSessionId(workoutId, actionDateKey);
      const existingSession = current.workoutSessions[sessionId];
      if (existingSession) {
        return existingSession.completedAt
          ? current
          : { ...current, activeWorkoutSessionId: existingSession.id };
      }

      const session = createWorkoutSession(workout, {
        dateKey: actionDateKey,
        legacyExerciseLogs: current.exerciseLogs,
      });

      return {
        ...current,
        activeWorkoutSessionId: session.id,
        workoutSessions: {
          ...current.workoutSessions,
          [session.id]: session,
        },
      };
    });
  };

  const updateExerciseLog = (sessionId: string | undefined, workoutId: string, exerciseId: string, log: ExerciseLog) => {
    const actionDateKey = getActionDateKey();
    updateData((current) => {
      const workout = current.workouts.find((item) => item.id === workoutId);
      if (!workout) {
        return current;
      }

      const storedSession = sessionId ? current.workoutSessions[sessionId] : undefined;
      const session = reconcileWorkoutSession(
        storedSession ??
          createWorkoutSession(workout, { dateKey: actionDateKey, legacyExerciseLogs: current.exerciseLogs }),
        workout
      );
      if (session.completedAt) {
        return current;
      }

      const exerciseLogs = {
        ...session.exerciseLogs,
        [exerciseId]: log,
      };
      const nextSession = {
        ...session,
        plannedSetCount: session.exerciseOrder.reduce(
          (total, orderedExerciseId) => total + (exerciseLogs[orderedExerciseId]?.plannedSetCount ?? 0),
          0
        ),
        exerciseLogs,
      };

      return {
        ...current,
        activeWorkoutSessionId: nextSession.id,
        workoutSessions: {
          ...current.workoutSessions,
          [nextSession.id]: nextSession,
        },
      };
    });
  };

  const finishWorkoutSession = (sessionId: string) => {
    getActionDateKey();
    const session = data.workoutSessions[sessionId];
    if (!session || session.completedAt) {
      return;
    }

    const progress = getWorkoutSessionProgress(session);
    if (progress.percentage < 60 && !window.confirm('Menos de 60% das séries planejadas foram concluídas. Finalizar mesmo assim?')) {
      return;
    }

    updateData((current) => {
      const currentSession = current.workoutSessions[sessionId];
      if (!currentSession || currentSession.completedAt) {
        return current;
      }

      const currentProgress = getWorkoutSessionProgress(currentSession);
      const isRankEligible = currentProgress.percentage >= 60;
      const completedAt = new Date().toISOString();
      const sessionDateKey = currentSession.dateKey;
      const checks = normalizeDailyChecks(current.dailyChecks[sessionDateKey], current.meals);
      const rankEvent = createRankEvent({
        kind: 'workout',
        dateKey: sessionDateKey,
        sourceId: currentSession.id,
        completedSets: currentProgress.completedSetCount,
        plannedSetCount: currentProgress.plannedSetCount,
        awardedAt: completedAt,
      });

      return {
        ...current,
        activeWorkoutSessionId: current.activeWorkoutSessionId === sessionId ? null : current.activeWorkoutSessionId,
        rank:
          isRankEligible && sessionDateKey >= current.rank.startedOn
            ? claimRankEvent(current.rank, rankEvent)
            : current.rank,
        workoutSessions: {
          ...current.workoutSessions,
          [sessionId]: { ...currentSession, completedAt },
        },
        dailyChecks: {
          ...current.dailyChecks,
          [sessionDateKey]: { ...checks, trainingDone: checks.trainingDone || isRankEligible },
        },
      };
    });
  };

  const updateGoals = (goals: Partial<Goals>) => {
    updateData((current) => ({
      ...current,
      goals: {
        ...current.goals,
        ...goals,
      },
      meals: calculateMealPlan(current.profile, { ...current.goals, ...goals }),
    }));
  };

  const updateProfile = (profile: Partial<Profile>) => {
    updateData((current) => {
      const nextProfile = {
        ...current.profile,
        ...profile,
        theme: 'dark' as const,
      };
      const nextGoals = calculateDynamicGoals(nextProfile);

      return {
        ...current,
        profile: nextProfile,
        goals: nextGoals,
        meals: calculateMealPlan(nextProfile, nextGoals),
        notifications: current.notifications ?? createDefaultNotificationSettings(),
      };
    });
  };

  const updateNotifications = (notificationsUpdate: Partial<AppData['notifications']>) => {
    updateData((current) => ({
      ...current,
      notifications: {
        ...(current.notifications ?? createDefaultNotificationSettings()),
        ...notificationsUpdate,
      },
    }));
  };

  const updateWorkouts = (workouts: WorkoutPlan[]) => {
    updateData((current) => ({ ...current, workouts }));
  };

  const updateWeekPlan = (weekPlan: WeekPlanItem[]) => {
    updateData((current) => ({ ...current, weekPlan }));
  };

  const addProgress = (entry: ProgressEntry) => {
    const actionDateKey = getActionDateKey();
    updateData((current) => {
      const isEligibleDate = entry.date >= current.rank.startedOn && entry.date <= actionDateKey;
      const rankEvent =
        entry.weightKg > 0 && isEligibleDate
          ? createRankEvent({ kind: 'progress-checkin', dateKey: entry.date, sourceId: entry.id })
          : null;

      return {
        ...current,
        rank: claimRankEvent(current.rank, rankEvent),
        profile: {
          ...current.profile,
          weightKg: entry.weightKg || current.profile.weightKg,
        },
        progressEntries: [...current.progressEntries.filter((item) => item.id !== entry.id), entry].sort((first, second) =>
          first.date.localeCompare(second.date)
        ),
      };
    });
  };

  const resetData = () => {
    const confirmed = window.confirm('Reiniciar todos os dados locais, sessões e rank do Ana Fit Planner?');
    if (confirmed) {
      setStoredData(createInitialData());
      changeTab('today');
    }
  };

  return (
    <main className="app-page" data-theme={data.profile.theme}>
      <div className="mx-auto max-w-lg">
        {activeTab === 'today' ? (
          <Today
            data={data}
            dateKey={dateKey}
            todayChecks={todayChecks}
            todayPlan={todayPlan}
            onSelectTab={changeTab}
            onStartWorkout={startWorkoutSession}
            onToggleCheck={toggleCheck}
          />
        ) : null}
        {activeTab === 'workout' ? (
          <Workout
            data={data}
            dateKey={dateKey}
            todayChecks={todayChecks}
            todayPlan={todayPlan}
            onExerciseLogChange={updateExerciseLog}
            onFinishSession={finishWorkoutSession}
            onStartSession={startWorkoutSession}
            onToggleCheck={toggleCheck}
            onWeekPlanChange={updateWeekPlan}
            onWorkoutsChange={updateWorkouts}
          />
        ) : null}
        {activeTab === 'diet' ? <Diet data={data} todayChecks={todayChecks} onToggleMeal={toggleMeal} /> : null}
        {activeTab === 'progress' ? <Progress data={data} onAddProgress={addProgress} /> : null}
        {activeTab === 'settings' ? (
          <Settings
            data={{ ...data, notifications }}
            onProfileChange={updateProfile}
            onGoalsChange={updateGoals}
            onNotificationsChange={updateNotifications}
            onResetData={resetData}
          />
        ) : null}
      </div>
      <BottomNav activeTab={activeTab} onChange={changeTab} />
    </main>
  );
}

export default App;
