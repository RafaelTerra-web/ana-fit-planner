import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './auth/authContext';
import { BottomNav } from './components/BottomNav';
import { AppTour } from './components/AppTour';
import { Onboarding, type OnboardingProfile } from './components/Onboarding';
import { RankLevelUpModal } from './components/RankLevelUpModal';
import { defaultGoals, defaultMeals, defaultProfile } from './data/dietPlan';
import { getTodayPlan } from './data/workoutPlan';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useCloudSync } from './hooks/useCloudSync';
import { APP_STORAGE_KEY, LEGACY_APP_STORAGE_KEY } from './lib/storage';
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
  MealPortion,
  MealPortionOverrides,
  Profile,
  ProgressEntry,
  WeekPlanItem,
  Workout as WorkoutPlan,
} from './types';
import { hasAssignedNutritionPlan, normalizeAssignedNutritionPlan } from './utils/assignedNutritionPlan';
import { calculateDynamicGoals, calculateMealPlan } from './utils/dietCalculator';
import { getActiveMealDay, getRequiredMeals, isMealApplicable } from './utils/meals';
import { createDefaultNotificationSettings, syncPushSubscriptionForCurrentUser } from './utils/notifications';
import {
  applyRankInactivityDecay,
  claimRankEvent,
  createInitialRankState,
  createRankEvent,
  getRankProgress,
  normalizeRankState,
  totalRankXp,
  type RankLevel,
} from './utils/ranks';
import {
  createWorkoutSession,
  getLocalDateKey,
  getWorkoutSessionId,
  getWorkoutSessionProgress,
  normalizeWorkoutSessions,
  reconcileWorkoutSession,
} from './utils/workoutSessions';
import { createDefaultWeekPlan, createDefaultWorkouts, getWeeklyActivityCounts, normalizeWorkoutData } from './utils/workoutVolume';

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

function createInitialData(profileName = defaultProfile.name): AppData {
  const dateKey = getLocalDateKey();
  return {
    schemaVersion: 5,
    profile: { ...defaultProfile, name: profileName },
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
    const legacyValue = window.localStorage.getItem(LEGACY_APP_STORAGE_KEY);
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

function normalizeMealPortionOverrides(value: unknown): MealPortionOverrides {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([portionKey, portions]) => {
      if (!Array.isArray(portions)) return [];
      const normalized = portions.flatMap((portion): MealPortion[] => {
        if (!isRecord(portion) || typeof portion.itemId !== 'string' || typeof portion.label !== 'string') return [];
        const quantity = typeof portion.quantity === 'number' && Number.isFinite(portion.quantity) && portion.quantity > 0
          ? portion.quantity
          : undefined;
        const unit = typeof portion.unit === 'string' && portion.unit.trim() ? portion.unit.trim() : undefined;
        return [{ itemId: portion.itemId, label: portion.label, ...(quantity ? { quantity } : {}), ...(unit ? { unit } : {}) }];
      });
      return normalized.length ? [[portionKey, normalized]] : [];
    }),
  );
}

function normalizeAppData(value: unknown): AppData {
  const fallback = createInitialData();

  if (!isRecord(value)) {
    return fallback;
  }

  const profile = isRecord(value.profile) ? value.profile : {};
  const goals = isRecord(value.goals) ? value.goals : {};
  const notifications = isRecord(value.notifications) ? value.notifications : {};
  let normalizedWorkoutData = normalizeWorkoutData({
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
    mealPortionOverrides: normalizeMealPortionOverrides(value.mealPortionOverrides),
    assignedNutritionPlan: normalizeAssignedNutritionPlan(value.assignedNutritionPlan),
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

  const storedTrainingDays = typeof profile.trainingDays === 'number' ? profile.trainingDays : fallback.profile.trainingDays;
  const storedCardioDays = typeof profile.cardioDays === 'number' ? profile.cardioDays : fallback.profile.cardioDays;
  if (
    !hasAssignedNutritionPlan(normalizedWorkoutData.assignedNutritionPlan) &&
    (storedTrainingDays !== normalizedWorkoutData.profile.trainingDays ||
      storedCardioDays !== normalizedWorkoutData.profile.cardioDays)
  ) {
    const scheduleGoals = calculateDynamicGoals(normalizedWorkoutData.profile);
    normalizedWorkoutData = {
      ...normalizedWorkoutData,
      goals: scheduleGoals,
      meals: calculateMealPlan(normalizedWorkoutData.profile, scheduleGoals),
    };
  }

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
  const { markOnboardingComplete, user } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>(getInitialTab);
  const [dateKey, setDateKey] = useState(getLocalDateKey);
  const [storedData, setStoredData] = useLocalStorage<unknown>(APP_STORAGE_KEY, getInitialStoredData);
  const normalizedData = useMemo(() => normalizeAppData(storedData), [storedData]);
  const data = useMemo(() => {
    const rank = applyRankInactivityDecay(normalizedData.rank);
    return rank === normalizedData.rank ? normalizedData : { ...normalizedData, rank };
  }, [normalizedData]);
  const [rankCelebration, setRankCelebration] = useState<RankLevel | null>(null);
  const [showAppTour, setShowAppTour] = useState(false);
  const lastObservedCelebrationRef = useRef(data.rank.lastCelebratedLevelId);
  const pendingRankCelebrationRef = useRef<RankLevel | null>(null);
  const notifications = data.notifications ?? createDefaultNotificationSettings();
  const onboardingRequired =
    (import.meta.env.DEV && new URLSearchParams(window.location.search).has('onboarding-preview')) ||
    data.profile.onboardingCompleted === false ||
    (user?.user_metadata?.requires_onboarding === true && data.profile.onboardingCompleted !== true);
  const cloudSync = useCloudSync(data, !onboardingRequired);
  const todayPlan = getTodayPlan(data.weekPlan);
  const todayChecks = normalizeDailyChecks(data.dailyChecks[dateKey], data.meals);

  useEffect(() => {
    if (!notifications.enabled || notifications.permission !== 'granted') return;

    const timer = window.setTimeout(() => {
      void syncPushSubscriptionForCurrentUser(notifications).catch(() => false);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [notifications]);

  useEffect(() => {
    const storedRank = isRecord(storedData) ? storedData.rank : undefined;
    const storedWeekPlan = isRecord(storedData) ? storedData.weekPlan : undefined;
    const storedProfile = isRecord(storedData) && isRecord(storedData.profile) ? storedData.profile : undefined;
    const storedNutritionPlan = isRecord(storedData) ? storedData.assignedNutritionPlan : undefined;
    if (
      !isRecord(storedData) ||
      storedData.schemaVersion !== 5 ||
      JSON.stringify(storedRank) !== JSON.stringify(data.rank) ||
      JSON.stringify(storedWeekPlan) !== JSON.stringify(data.weekPlan) ||
      storedProfile?.trainingDays !== data.profile.trainingDays ||
      storedProfile?.cardioDays !== data.profile.cardioDays ||
      JSON.stringify(storedNutritionPlan) !== JSON.stringify(data.assignedNutritionPlan)
    ) {
      setStoredData(data);
    }
  }, [data, setStoredData, storedData]);

  useEffect(() => {
    const showPendingCelebration = () => {
      const pendingCelebration = pendingRankCelebrationRef.current;
      if (!pendingCelebration || document.visibilityState !== 'visible' || !document.hasFocus()) {
        return;
      }

      pendingRankCelebrationRef.current = null;
      setRankCelebration(pendingCelebration);
    };

    window.addEventListener('focus', showPendingCelebration);
    document.addEventListener('visibilitychange', showPendingCelebration);
    return () => {
      window.removeEventListener('focus', showPendingCelebration);
      document.removeEventListener('visibilitychange', showPendingCelebration);
    };
  }, []);

  useEffect(() => {
    const celebratedLevelId = data.rank.lastCelebratedLevelId;
    if (!celebratedLevelId || celebratedLevelId === lastObservedCelebrationRef.current) {
      return;
    }

    lastObservedCelebrationRef.current = celebratedLevelId;
    const currentLevel = getRankProgress(totalRankXp(data.rank)).current;
    if (currentLevel.id !== celebratedLevelId) {
      return;
    }

    if (document.visibilityState === 'visible' && document.hasFocus()) {
      setRankCelebration(currentLevel);
      return;
    }

    pendingRankCelebrationRef.current = currentLevel;
  }, [data.rank]);

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
        const currentDayPlan = getTodayPlan(current.weekPlan);
        const canClaim = kind !== 'cardio' || (currentDayPlan.activityType === 'cardio' && Boolean(currentDayPlan.cardio));
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
      const activeMealDay = getActiveMealDay(getTodayPlan(current.weekPlan).activityType);
      const selectedMeal = current.meals.find((meal) => meal.id === mealId);
      if (!selectedMeal || !isMealApplicable(selectedMeal, activeMealDay)) {
        return current;
      }

      const checks = normalizeDailyChecks(current.dailyChecks[actionDateKey], current.meals);
      const nextMeals = { ...checks.meals, [mealId]: !checks.meals[mealId] };
      const requiredMeals = getRequiredMeals(current.meals, activeMealDay);
      const completedMeals = requiredMeals.filter((meal) => nextMeals[meal.id]).length;
      const nutritionCompleted = requiredMeals.length > 0 && completedMeals / requiredMeals.length >= 0.8;
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
    updateData((current) => {
      if (hasAssignedNutritionPlan(current.assignedNutritionPlan)) {
        return current;
      }

      return {
        ...current,
        goals: {
          ...current.goals,
          ...goals,
        },
        meals: calculateMealPlan(current.profile, { ...current.goals, ...goals }),
        mealPortionOverrides: {},
      };
    });
  };

  const updateProfile = (profile: Partial<Profile>) => {
    updateData((current) => {
      const hasAssignedPlan = hasAssignedNutritionPlan(current.assignedNutritionPlan);
      const nextProfile = {
        ...current.profile,
        ...profile,
        ...(hasAssignedPlan
          ? { preferredFoods: current.profile.preferredFoods, avoidedFoods: current.profile.avoidedFoods }
          : {}),
        theme: 'dark' as const,
      };
      const nextGoals = calculateDynamicGoals(nextProfile);

      return {
        ...current,
        profile: nextProfile,
        goals: hasAssignedPlan ? current.goals : nextGoals,
        meals: hasAssignedPlan ? current.meals : calculateMealPlan(nextProfile, nextGoals),
        mealPortionOverrides: hasAssignedPlan ? current.mealPortionOverrides : {},
        notifications: current.notifications ?? createDefaultNotificationSettings(),
      };
    });
  };

  const completeOnboarding = async (profile: OnboardingProfile) => {
    const hasAssignedPlan = hasAssignedNutritionPlan(data.assignedNutritionPlan);
    const nextProfile: Profile = {
      ...data.profile,
      ...profile,
      ...(hasAssignedPlan
        ? { preferredFoods: data.profile.preferredFoods, avoidedFoods: data.profile.avoidedFoods }
        : {}),
      onboardingCompleted: true,
      theme: 'dark',
    };
    const nextGoals = calculateDynamicGoals(nextProfile);
    const completedData = normalizeAppData({
      ...data,
      profile: nextProfile,
      goals: hasAssignedPlan ? data.goals : nextGoals,
      meals: hasAssignedPlan ? data.meals : calculateMealPlan(nextProfile, nextGoals),
    });

    const persistedData = await markOnboardingComplete(completedData);
    setStoredData(normalizeAppData(persistedData));
    setShowAppTour(true);
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

  const updateMealPortions = (portionKey: string, portions: MealPortion[]) => {
    updateData((current) => {
      const nextOverrides = { ...(current.mealPortionOverrides ?? {}) };
      if (portions.length) {
        nextOverrides[portionKey] = portions;
      } else {
        delete nextOverrides[portionKey];
      }
      return { ...current, mealPortionOverrides: nextOverrides };
    });
  };

  const updateWorkouts = (workouts: WorkoutPlan[]) => {
    updateData((current) => {
      const workoutsById = new Map(workouts.map((workout) => [workout.id, workout]));
      return {
        ...current,
        workouts,
        weekPlan: current.weekPlan.map((item) => {
          const workout = item.workoutId ? workoutsById.get(item.workoutId) : undefined;
          return workout ? { ...item, title: workout.title } : item;
        }),
      };
    });
  };

  const updateWeekPlan = (weekPlan: WeekPlanItem[]) => {
    updateData((current) => {
      const counts = getWeeklyActivityCounts(weekPlan);
      if (current.profile.trainingDays === counts.workout && current.profile.cardioDays === counts.cardio) {
        return { ...current, weekPlan };
      }

      const nextProfile = {
        ...current.profile,
        trainingDays: counts.workout,
        cardioDays: counts.cardio,
      };
      const hasAssignedPlan = hasAssignedNutritionPlan(current.assignedNutritionPlan);
      const nextGoals = calculateDynamicGoals(nextProfile);

      return {
        ...current,
        weekPlan,
        profile: nextProfile,
        goals: hasAssignedPlan ? current.goals : nextGoals,
        meals: hasAssignedPlan ? current.meals : calculateMealPlan(nextProfile, nextGoals),
        mealPortionOverrides: hasAssignedPlan ? current.mealPortionOverrides : {},
      };
    });
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
      const defaultInitialData = createInitialData(data.profile.name);
      const initialData = hasAssignedNutritionPlan(data.assignedNutritionPlan)
        ? {
            ...defaultInitialData,
            profile: {
              ...defaultInitialData.profile,
              preferredFoods: data.profile.preferredFoods,
              avoidedFoods: data.profile.avoidedFoods,
            },
            goals: data.goals,
            meals: data.meals,
            mealPortionOverrides: data.mealPortionOverrides,
            assignedNutritionPlan: data.assignedNutritionPlan,
            dailyChecks: {
              [getLocalDateKey()]: createDailyChecks(data.meals),
            },
          }
        : defaultInitialData;
      lastObservedCelebrationRef.current = initialData.rank.lastCelebratedLevelId;
      pendingRankCelebrationRef.current = null;
      setRankCelebration(null);
      setStoredData(initialData);
      changeTab('today');
    }
  };

  if (onboardingRequired) {
    return <Onboarding profile={data.profile} onComplete={completeOnboarding} />;
  }

  return (
    <>
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
          />
        ) : null}
        {activeTab === 'diet' ? (
          <Diet data={data} todayChecks={todayChecks} onToggleMeal={toggleMeal} onPortionsChange={updateMealPortions} />
        ) : null}
        {activeTab === 'progress' ? <Progress data={data} onAddProgress={addProgress} /> : null}
        {activeTab === 'settings' ? (
          <Settings
            data={{ ...data, notifications }}
            onProfileChange={updateProfile}
            onGoalsChange={updateGoals}
            onNotificationsChange={updateNotifications}
            onWeekPlanChange={updateWeekPlan}
            onWorkoutsChange={updateWorkouts}
            onResetData={resetData}
            onOpenTutorial={() => setShowAppTour(true)}
            cloudSync={cloudSync}
          />
        ) : null}
        </div>
        <BottomNav activeTab={activeTab} onChange={changeTab} />
      </main>
      {rankCelebration ? <RankLevelUpModal level={rankCelebration} onDismiss={() => setRankCelebration(null)} /> : null}
      {showAppTour ? (
        <AppTour activeTab={activeTab} onClose={() => setShowAppTour(false)} onTabChange={changeTab} />
      ) : null}
    </>
  );
}

export default App;
