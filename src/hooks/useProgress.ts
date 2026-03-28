import { useCallback, useState } from "react";

const MODULE_TYPES = ["kana", "japones-pratica", "numeros-familia", "numeros-particulas", "verbos-particulas"] as const;
const STORAGE_KEY = "hidenihon_progress_v2";

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

type AllProgress = Record<ModuleType, ModuleProgress>;

const DEFAULT_PROGRESS = MODULE_TYPES.reduce((acc, module) => {
  acc[module] = { module, lessons: {}, totalChars: module === "kana" ? 107 : 0, learnedChars: 0 };
  return acc;
}, {} as AllProgress);

function loadProgress(): AllProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PROGRESS, ...JSON.parse(raw) } : DEFAULT_PROGRESS;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function saveProgress(progress: AllProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    return;
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<AllProgress>(loadProgress);

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
                errorCount: { ...(existing?.errorCount ?? {}), ...errorMap },
              },
            },
          },
        };
        saveProgress(next);
        return next;
      });
    },
    []
  );

  const isLessonUnlocked = useCallback((_module: ModuleType, _lessonIndex: number): boolean => true, []);

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
    saveProgress(DEFAULT_PROGRESS);
    setProgress(DEFAULT_PROGRESS);
  }, []);

  return {
    progress,
    getModulePercent,
    getLessonProgress,
    completeLesson,
    isLessonUnlocked,
    getErrorChars,
    resetProgress,
  };
}
