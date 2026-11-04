import type { LessonGroup } from "@/data/hiragana";
import type { LessonProgress } from "@/hooks/useProgress";

/** Concluída · a próxima a fazer (a 1ª liberada e não concluída) · liberada · bloqueada. */
export type LessonState = "completed" | "next" | "available" | "locked";

export interface TrailLesson {
  group: LessonGroup;
  /** Id gravado no progresso (`seção__grupo`). */
  scopedId: string;
  index: number;
  state: LessonState;
  /** Melhor nota (0–100) se concluída. */
  score: number | null;
}

export interface TrailSummary {
  completed: number;
  total: number;
  percent: number;
}

interface TrailInput {
  groups: readonly LessonGroup[];
  getScopedId: (group: LessonGroup) => string;
  getProgress: (scopedId: string) => LessonProgress | null;
  isUnlocked: (index: number, lessonIds: string[]) => boolean;
}

/** Lições na ordem do módulo, cada uma com o estado que o card mostra. */
export function buildTrail({ groups, getScopedId, getProgress, isUnlocked }: TrailInput): TrailLesson[] {
  const lessonIds = groups.map(getScopedId);
  let nextFound = false;

  return groups.map((group, index) => {
    const scopedId = lessonIds[index];
    const progress = getProgress(scopedId);
    const completed = progress?.completed ?? false;
    const unlocked = isUnlocked(index, lessonIds);

    let state: LessonState = "locked";
    if (completed) state = "completed";
    else if (unlocked && !nextFound) {
      state = "next";
      nextFound = true;
    } else if (unlocked) state = "available";

    return { group, scopedId, index, state, score: completed ? (progress?.score ?? 0) : null };
  });
}

export function summarizeTrail(trail: readonly TrailLesson[]): TrailSummary {
  const completed = trail.filter((lesson) => lesson.state === "completed").length;
  return { completed, total: trail.length, percent: trail.length === 0 ? 0 : Math.round((completed / trail.length) * 100) };
}

export function nextLesson(trail: readonly TrailLesson[]): TrailLesson | null {
  return trail.find((lesson) => lesson.state === "next") ?? null;
}

/** Seções do módulo Kana: a seção vai na URL (`?secao=`) para a volta da lição cair no mesmo lugar. */
export const KANA_SECTION_IDS = ["hiragana", "katakana", "kanji"] as const;
export type KanaSectionId = (typeof KANA_SECTION_IDS)[number];

export function parseKanaSection(value: string | null): KanaSectionId {
  return KANA_SECTION_IDS.find((id) => id === value) ?? "hiragana";
}

/** Rota do módulo; vindo de uma lição de kana, volta para a seção dela (`katakana__ka-row` → `?secao=katakana`). */
export function moduleHref(module: string, lessonId?: string): string {
  const section = lessonId?.split("__")[0] ?? null;
  return module === "kana" && KANA_SECTION_IDS.some((id) => id === section) ? `/module/${module}?secao=${section}` : `/module/${module}`;
}

/** Primeiro caractere da lição para o emblema ("あ行" → あ; "おはよう" → お). */
export function lessonGlyph(group: LessonGroup, fallback: string): string {
  const first = group.chars[0]?.char;
  return first ? (Array.from(first)[0] ?? fallback) : fallback;
}
