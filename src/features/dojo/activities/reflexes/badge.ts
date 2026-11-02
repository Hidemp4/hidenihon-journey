import type { ActivityBadge } from "@/features/dojo/registry";
import { formatMs } from "@/features/dojo/shared/format";
import { MIN_CORRECT_FOR_RECORD } from "./constants";
import { loadLocalDojoSessions } from "./localRepository";
import { calculateDojoStats } from "./metrics";
import type { DojoSession } from "./types";

/**
 * "Melhor média" = a menor média de acertos entre as sessões guardadas (a mesma "Média" do placar).
 * Só valem sessões com `MIN_CORRECT_FOR_RECORD` acertos ou mais.
 */
export function describeReflexesBadge(sessions: readonly DojoSession[]): ActivityBadge {
  if (sessions.length === 0) return { text: "Nenhuma batalha ainda", tone: "neutral" };

  let best: number | null = null;
  for (const session of sessions) {
    const stats = calculateDojoStats(session.attempts);
    if (stats.correct < MIN_CORRECT_FOR_RECORD || stats.averageCompletionMs == null) continue;
    if (best == null || stats.averageCompletionMs < best) best = stats.averageCompletionMs;
  }

  return best == null
    ? { text: `Recorde a partir de ${MIN_CORRECT_FOR_RECORD} acertos`, tone: "neutral" }
    : { text: `Melhor média ${formatMs(best)}`, tone: "accent" };
}

export function getReflexesBadge(): ActivityBadge {
  return describeReflexesBadge(loadLocalDojoSessions());
}
