import { recordActivity } from "@/features/dojo/shared/activityLog";
import { masteryStore, type MasteryResult } from "@/features/dojo/shared/mastery";
import { recordProgression } from "@/features/dojo/progression/store";
import { brushSummary } from "@/features/dojo/progression/summaries";
import { recordPracticed } from "./brushRepository";
import type { BrushSession } from "./types";

/** Estudar ordem não vira resultado (só se olha). O tempo não entra: escrever leva segundos, não mede leitura. */
export function sessionToMasteryResults(session: Pick<BrushSession, "attempts">): MasteryResult[] {
  return session.attempts.flatMap((attempt) => (attempt.outcome ? [{ itemId: attempt.card.item.id, outcome: attempt.outcome }] : []));
}

/** Vale gravar ao sair no meio? Só se já há kana desenhado e avaliado. */
export function hasProgress(session: Pick<BrushSession, "attempts">): boolean {
  return session.attempts.some((attempt) => attempt.outcome != null);
}

/**
 * Grava domínio, "praticados" e progresso. Idempotente: pode ser chamada no resumo e de novo ao sair
 * da página. `finished`: chegou ao resumo (sair no meio não vale vitória).
 */
export function commitBrushSession(session: BrushSession, now: number, { finished = false }: { finished?: boolean } = {}): boolean {
  const results = sessionToMasteryResults(session);
  if (results.length === 0) return true;

  const savedMastery = masteryStore.recordResults(results, { sourceId: session.id, now });
  const savedPracticed = recordPracticed(
    session.attempts.flatMap((attempt) => (attempt.outcome ? [{ itemId: attempt.card.item.id, score: attempt.score?.score ?? 0 }] : [])),
    now
  );
  // Sequência e missão do dia: caracteres escritos e avaliados.
  const savedActivity = recordActivity("brush", results.length, { sourceId: session.id, now });
  // XP e troféus (depois da atividade do dia: a missão e a sequência já contam esta sessão).
  recordProgression(brushSummary(session, finished), { now });
  return savedMastery && savedPracticed && savedActivity;
}
