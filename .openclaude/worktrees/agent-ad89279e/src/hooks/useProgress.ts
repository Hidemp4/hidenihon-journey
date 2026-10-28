import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuthContext } from "@/contexts/auth-context-core";
import { loadUserProgress, saveUserProgress } from "@/lib/progressDb";

const MODULE_TYPES = ["kana", "japones-pratica", "numeros-familia", "numeros-particulas", "verbos-particulas"] as const;

export type ModuleType = (typeof MODULE_TYPES)[number];

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  score: number;
  lastPracticed: string;
  errorCount: Record<string, number>;
}

export interface ModuleProgress {
  module: ModuleType;
  lessons: Record<string, LessonProgress>;
  totalChars: number;
  learnedChars: number;
}

export type AllProgress = Record<ModuleType, ModuleProgress>;

const DEFAULT_PROGRESS = MODULE_TYPES.reduce((acc, module) => {
  acc[module] = { module, lessons: {}, totalChars: module === "kana" ? 107 : 0, learnedChars: 0 };
  return acc;
}, {} as AllProgress);

function createDefaultProgress(): AllProgress {
  return structuredClone(DEFAULT_PROGRESS);
}

function normalizeProgress(progress: AllProgress | null): AllProgress {
  return progress ? { ...createDefaultProgress(), ...progress } : createDefaultProgress();
}

function mergeErrorCounts(current: Record<string, number>, next: Record<string, number>) {
  const merged = { ...current };

  for (const [char, count] of Object.entries(next)) {
    merged[char] = (merged[char] ?? 0) + count;
  }

  return merged;
}

type ProgressContextValue = ReturnType<typeof useProgressState>;

const ProgressContext = createContext<ProgressContextValue | null>(null);

function useProgressState() {
  const { user } = useAuthContext();
  const userId = user?.id;
  const [progress, setProgress] = useState<AllProgress>(() => createDefaultProgress());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (!userId) {
      setProgress(createDefaultProgress());
      return;
    }

    setLoading(true);
    setError("");
    loadUserProgress(userId)
      .then((storedProgress) => {
        if (active) setProgress(normalizeProgress(storedProgress));
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Erro ao carregar progresso.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const getModulePercent = useCallback((module: ModuleType): number => {
    const mod = progress[module];
    if (!mod) return 0;
    if (mod.totalChars > 0) return Math.round((mod.learnedChars / mod.totalChars) * 100);
    const lessons = Object.values(mod.lessons);
    return lessons.length ? Math.round((lessons.filter(({ completed }) => completed).length / lessons.length) * 100) : 0;
  }, [progress]);

  const getLessonProgress = useCallback(
    (module: ModuleType, lessonId: string): LessonProgress | null => progress[module]?.lessons[lessonId] ?? null,
    [progress]
  );

  const completeLesson = useCallback(
    (module: ModuleType, lessonId: string, score: number, charsInLesson: number, errorMap: Record<string, number>) => {
      setProgress((prev) => {
        const mod = prev[module] ?? { module, lessons: {}, totalChars: 0, learnedChars: 0 };
        const existing = mod.lessons[lessonId];
        const learned = existing?.completed ? mod.learnedChars : mod.learnedChars + charsInLesson;
        const next: AllProgress = {
          ...prev,
          [module]: {
            ...mod,
            learnedChars: mod.totalChars ? Math.min(learned, mod.totalChars) : learned,
            lessons: {
              ...mod.lessons,
              [lessonId]: {
                lessonId,
                completed: true,
                score: Math.max(score, existing?.score ?? 0),
                lastPracticed: new Date().toISOString(),
                errorCount: mergeErrorCounts(existing?.errorCount ?? {}, errorMap),
              },
            },
          },
        };
        if (userId) {
          saveUserProgress(userId, next).catch((saveError) => {
            setError(saveError instanceof Error ? saveError.message : "Erro ao salvar progresso.");
          });
        }
        return next;
      });
    },
    [userId]
  );

  const isLessonUnlocked = useCallback((module: ModuleType, lessonIndex: number, lessonIds: string[] = []): boolean => {
    if (module === "kana") return true;
    if (lessonIndex === 0) return true;
    const previousLessonId = lessonIds[lessonIndex - 1];
    if (!previousLessonId) return false;
    return progress[module]?.lessons[previousLessonId]?.completed ?? false;
  }, [progress]);

  const getErrorChars = useCallback((module: ModuleType): string[] => {
    const mod = progress[module];
    if (!mod) return [];
    const chars = Object.values(mod.lessons).flatMap(({ errorCount }) =>
      Object.entries(errorCount)
        .filter(([, count]) => count >= 2)
        .map(([char]) => char)
    );
    return [...new Set(chars)];
  }, [progress]);

  const resetProgress = useCallback(() => {
    const next = createDefaultProgress();
    setProgress(next);
    if (userId) {
      saveUserProgress(userId, next).catch((saveError) => {
        setError(saveError instanceof Error ? saveError.message : "Erro ao resetar progresso.");
      });
    }
  }, [userId]);

  return {
    progress,
    loading,
    error,
    getModulePercent,
    getLessonProgress,
    completeLesson,
    isLessonUnlocked,
    getErrorChars,
    resetProgress,
  };
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const value = useProgressState();

  return createElement(ProgressContext.Provider, { value }, children);
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress deve ser usado dentro de ProgressProvider.");
  return value;
}
