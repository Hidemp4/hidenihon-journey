import { useMemo } from "react";
import { MODULE_LIST } from "@/data/modules";
import { useProgress, type ModuleProgress } from "@/hooks/useProgress";

type Lessons = ModuleProgress["lessons"];

export const countCompleted = (lessons: Lessons) =>
  Object.values(lessons).filter((l) => l.completed).length;

const lastPracticed = (lessons: Lessons) =>
  Math.max(0, ...Object.values(lessons).map((l) => Date.parse(l.lastPracticed) || 0));

const byRecent = (a: { time: number }, b: { time: number }) => b.time - a.time;

export function useJourney() {
  const { getModulePercent, progress, loading, error } = useProgress();

  return useMemo(() => {
    const summaries = MODULE_LIST.filter((m) => !m.locked).map((module) => ({
      module,
      percent: getModulePercent(module.id),
      time: progress[module.id] ? lastPracticed(progress[module.id].lessons) : 0,
    }));

    const all = Object.values(progress);
    const overallPct = summaries.length
      ? Math.round(summaries.reduce((sum, s) => sum + s.percent, 0) / summaries.length)
      : 0;

    const active =
      summaries.filter((s) => s.percent > 0 && s.percent < 100).sort(byRecent)[0] ??
      summaries.find((s) => s.percent === 0) ??
      summaries.filter((s) => s.percent === 100).sort(byRecent)[0] ??
      summaries[0];

    const activePercent = active?.percent ?? 0;

    return {
      loading,
      error,
      progress,
      getModulePercent,
      overallPct,
      totalLessons: all.reduce((sum, m) => sum + countCompleted(m.lessons), 0),
      totalChars: all.reduce((sum, m) => sum + m.learnedChars, 0),
      activeModule: active?.module,
      activePercent,
      activeAction:
        activePercent === 100
          ? "Revisar missão"
          : activePercent > 0
            ? "Continuar estudando"
            : "Começar treinamento",
    };
  }, [progress, loading, error, getModulePercent]);
}

export type Journey = ReturnType<typeof useJourney>;