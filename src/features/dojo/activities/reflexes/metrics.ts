import { TYPING_MS_PER_EXTRA_CHAR } from "./constants";
import type { DojoAttempt, DojoStats, WeakKana } from "./types";

function average(values: readonly number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values: readonly number[]) {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) return sorted[midpoint];
  return Math.round((sorted[midpoint - 1] + sorted[midpoint]) / 2);
}

function minimum(values: readonly number[]) {
  if (values.length === 0) return null;
  return values.reduce((min, value) => (value < min ? value : min), values[0]);
}

function compareWeakKana(a: WeakKana, b: WeakKana) {
  if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
  if (a.misses !== b.misses) return b.misses - a.misses;
  return (b.averageCompletionMs ?? Infinity) - (a.averageCompletionMs ?? Infinity);
}

export function calculateDojoStats(attempts: readonly DojoAttempt[]): DojoStats {
  const correctAttempts = attempts.filter((attempt) => attempt.outcome === "correct");
  const timeouts = attempts.filter((attempt) => attempt.outcome === "timeout").length;
  const correct = correctAttempts.length;
  const reactionTimes = attempts.flatMap((attempt) => (attempt.reactionMs == null ? [] : [attempt.reactionMs]));
  const correctTimes = correctAttempts.map((attempt) => attempt.completionMs);

  const byKana = new Map<string, DojoAttempt[]>();
  for (const attempt of attempts) {
    const key = `${attempt.alphabet}:${attempt.kana}`;
    const list = byKana.get(key);
    if (list) list.push(attempt);
    else byKana.set(key, [attempt]);
  }

  const weakKana = Array.from(byKana.values())
    .map((kanaAttempts): WeakKana => {
      const first = kanaAttempts[0];
      const kanaCorrect = kanaAttempts.filter((attempt) => attempt.outcome === "correct");
      return {
        kana: first.kana,
        romaji: first.romaji,
        averageCompletionMs: average(kanaCorrect.map((attempt) => attempt.completionMs)),
        accuracy: Math.round((kanaCorrect.length / kanaAttempts.length) * 100),
        attempts: kanaAttempts.length,
        misses: kanaAttempts.length - kanaCorrect.length,
      };
    })
    // Só entra quem realmente errou: com 100% de acerto a lista fica vazia.
    .filter((item) => item.misses > 0)
    .sort(compareWeakKana)
    .slice(0, 5);

  return {
    total: attempts.length,
    correct,
    wrong: attempts.length - correct - timeouts,
    timeouts,
    accuracy: attempts.length === 0 ? 0 : Math.round((correct / attempts.length) * 100),
    averageReactionMs: average(reactionTimes),
    averageCompletionMs: average(correctTimes),
    medianCompletionMs: median(correctTimes),
    fastestCompletionMs: minimum(correctTimes),
    weakKana,
  };
}

/**
 * Desconta o tempo "justo" de digitação, assim `shi` (3 letras) e `a` (1 letra)
 * são avaliados pela mesma régua de reação.
 */
export function getPerformanceLabel(completionMs: number | null, romajiLength = 1) {
  if (completionMs == null) return "Sem resposta";

  const adjusted = Math.max(0, completionMs - Math.max(0, romajiLength - 1) * TYPING_MS_PER_EXTRA_CHAR);
  if (adjusted < 400) return "Instantâneo";
  if (adjusted < 600) return "Bom";
  if (adjusted < 800) return "Melhorando";
  if (adjusted < 1200) return "Lento";
  return "Treinar mais";
}

export function countCurrentCombo(attempts: readonly DojoAttempt[]) {
  let combo = 0;

  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    if (attempts[index].outcome !== "correct") break;
    combo += 1;
  }

  return combo;
}

export function getComboGoal(attemptCount: number) {
  return Math.min(10, Math.max(3, Math.ceil((attemptCount + 1) / 2)));
}
