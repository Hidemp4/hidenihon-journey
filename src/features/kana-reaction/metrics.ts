import type { KanaReactionAttempt, KanaReactionStats } from "./types";

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values: number[]) {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) return sorted[midpoint];
  return Math.round((sorted[midpoint - 1] + sorted[midpoint]) / 2);
}

export function calculateKanaReactionStats(attempts: KanaReactionAttempt[]): KanaReactionStats {
  const correct = attempts.filter((attempt) => attempt.correct).length;
  const reactionTimes = attempts.flatMap((attempt) => attempt.reactionMs == null ? [] : [attempt.reactionMs]);
  const completionTimes = attempts.map((attempt) => attempt.completionMs);
  const byKana = new Map<string, KanaReactionAttempt[]>();

  for (const attempt of attempts) {
    const key = `${attempt.alphabet}:${attempt.kana}`;
    byKana.set(key, [...(byKana.get(key) ?? []), attempt]);
  }

  const weakKana = Array.from(byKana.values())
    .map((kanaAttempts) => {
      const first = kanaAttempts[0];
      const kanaCorrect = kanaAttempts.filter((attempt) => attempt.correct).length;
      return {
        kana: first.kana,
        romaji: first.romaji,
        averageCompletionMs: average(kanaAttempts.map((attempt) => attempt.completionMs)) ?? 0,
        accuracy: Math.round((kanaCorrect / kanaAttempts.length) * 100),
        attempts: kanaAttempts.length,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy || b.averageCompletionMs - a.averageCompletionMs)
    .slice(0, 5);

  return {
    total: attempts.length,
    correct,
    accuracy: attempts.length === 0 ? 0 : Math.round((correct / attempts.length) * 100),
    averageReactionMs: average(reactionTimes),
    averageCompletionMs: average(completionTimes),
    medianCompletionMs: median(completionTimes),
    fastestCompletionMs: completionTimes.length === 0 ? null : Math.min(...completionTimes),
    weakKana,
  };
}

export function getPerformanceLabel(completionMs: number | null) {
  if (completionMs == null) return "Sem resposta";
  if (completionMs < 400) return "Instantâneo";
  if (completionMs < 600) return "Bom";
  if (completionMs < 800) return "Melhorando";
  if (completionMs < 1200) return "Lento";
  return "Treinar mais";
}
